import type { Assessment, EvidenceRef } from "./types.js";
import { DIMENSION_MAX, MAX_TOTAL } from "./types.js";
import type { RepoFacts } from "./inspect.js";

export interface BaselineOptions {
  readonly provider?: LlmProvider;
}

export interface LlmProvider {
  readonly name: string;
  complete(prompt: string): Promise<string>;
}

export class DeterministicProvider implements LlmProvider {
  readonly name = "deterministic-heuristic";
  async complete(): Promise<string> {
    return "heuristic";
  }
}

export interface BaselineResult {
  readonly assessment: Assessment;
  readonly rawPrompt: string;
  readonly rawResponse: string;
  readonly provider: string;
}

export class Baseline {
  private readonly provider: LlmProvider;

  constructor(options: BaselineOptions = {}) {
    this.provider = options.provider ?? new DeterministicProvider();
  }

  async run(facts: RepoFacts): Promise<BaselineResult> {
    const prompt = this.buildPrompt(facts);
    const rawResponse = await this.provider.complete(prompt);
    const assessment = this.heuristicAssessment(facts, rawResponse);
    return { assessment, rawPrompt: prompt, rawResponse, provider: this.provider.name };
  }

  private buildPrompt(f: RepoFacts): string {
    return `You are a code reviewer. Assess the quality of the repository "${f.repoName}".
It has ${f.fileCount} files, ${f.hasTests ? "has tests" : "no tests"},
${f.dependencyCount} dependencies, and language ${f.language}.
Is this repository good? Give a verdict and a score out of ${MAX_TOTAL}.`;
  }

  private heuristicAssessment(f: RepoFacts, raw: string): Assessment {
    const documentation = this.dim(
      "documentation",
      f.hasReadme ? half(DIMENSION_MAX.documentation) : 2,
      f.hasReadme ? "Sees a README but cannot judge its depth or usefulness." : "Sees no README.",
      this.ev("README.md", "file", "README presence check"),
    );
    const architecture = this.dim(
      "architecture",
      f.fileCount > 0 ? half(DIMENSION_MAX.architecture) : 0,
      `Naive file-count heuristic (${f.fileCount} files); no structural analysis.`,
      [],
    );
    const tests = this.dim(
      "tests",
      f.hasTests ? half(DIMENSION_MAX.tests) : 0,
      f.hasTests ? "Notices tests exist but cannot assess coverage or quality." : "Sees no tests.",
      [],
    );
    const dependencies = this.dim(
      "dependencies",
      f.dependencyCount > 0 ? half(DIMENSION_MAX.dependencies) : 0,
      `Binary dependency check (${f.dependencyCount} deps); no risk or security analysis.`,
      [],
    );
    const build = this.dim(
      "build",
      f.manifest.exists ? half(DIMENSION_MAX.build) : 0,
      "Binary manifest check; does not verify the build actually runs.",
      [],
    );
    const maintenance = this.dim(
      "maintenance",
      f.hasLicense ? half(DIMENSION_MAX.maintenance) : 0,
      "Binary license check; no versioning or activity signal.",
      [],
    );

    const dimensions = [documentation, architecture, tests, dependencies, build, maintenance];
    const totalScore = dimensions.reduce((a, b) => a + b.score, 0);
    const ratio = totalScore / MAX_TOTAL;
    const grade = rationGrade(ratio);
    return {
      repoName: f.repoName,
      dimensions,
      totalScore,
      maxTotal: MAX_TOTAL,
      grade,
      summary: `Naive single-prompt verdict: "${raw.slice(0, 120)}". Dimensions are binary presence checks with no cross-referenced evidence.`,
      generatedAt: new Date().toISOString(),
    };
  }

  private dim(
    dimension: Assessment["dimensions"][number]["dimension"],
    score: number,
    rationale: string,
    evidence: EvidenceRef[],
  ): Assessment["dimensions"][number] {
    return {
      dimension,
      score,
      max: DIMENSION_MAX[dimension],
      rationale,
      evidence,
    };
  }

  private ev(path: string | null, kind: EvidenceRef["kind"], note: string): EvidenceRef[] {
    if (path === null) return [];
    return [{ path, kind, note }];
  }
}

function rationGrade(ratio: number): Assessment["grade"] {
  if (ratio >= 0.9) return "A";
  if (ratio >= 0.8) return "B";
  if (ratio >= 0.7) return "C";
  if (ratio >= 0.6) return "D";
  return "F";
}

function half(max: number): number {
  return Math.floor(max / 2);
}