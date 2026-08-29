import type {
  Assessment,
  DimensionName,
  DimensionScore,
  EvidenceRef,
  Grade,
} from "./types.js";
import { DIMENSION_MAX, DIMENSIONS, MAX_TOTAL } from "./types.js";
import type { RepoFacts } from "./inspect.js";

export interface ScoreResult {
  readonly assessment: Assessment;
}

function gradeFor(ratio: number): Grade {
  if (ratio >= 0.9) return "A";
  if (ratio >= 0.8) return "B";
  if (ratio >= 0.7) return "C";
  if (ratio >= 0.6) return "D";
  return "F";
}

function clamp(value: number, max: number): number {
  return Math.max(0, Math.min(max, value));
}

function ref(path: string | null, kind: EvidenceRef["kind"], note: string): EvidenceRef[] {
  if (path === null) return [];
  return [{ path, kind, note }];
}

export class RubricScorer {
  score(facts: RepoFacts): Assessment {
    const dimensions: DimensionScore[] = DIMENSIONS.map((d) =>
      this.scoreDimension(d, facts),
    );
    const totalScore = dimensions.reduce((a, b) => a + b.score, 0);
    const grade = gradeFor(totalScore / MAX_TOTAL);
    return {
      repoName: facts.repoName,
      dimensions,
      totalScore,
      maxTotal: MAX_TOTAL,
      grade,
      summary: "",
      generatedAt: new Date().toISOString(),
    };
  }

  private scoreDimension(dim: DimensionName, f: RepoFacts): DimensionScore {
    switch (dim) {
      case "documentation":
        return this.docs(f);
      case "architecture":
        return this.architecture(f);
      case "tests":
        return this.tests(f);
      case "dependencies":
        return this.deps(f);
      case "build":
        return this.build(f);
      case "maintenance":
        return this.maintenance(f);
    }
  }

  private docs(f: RepoFacts): DimensionScore {
    const max = DIMENSION_MAX.documentation;
    let score = 0;
    const evidence: EvidenceRef[] = [];
    if (f.hasReadme) {
      score += 6;
      evidence.push(...ref("README.md", "file", "README present"));
      if (f.readmeLength > 1000) {
        score += 4;
        evidence.push(...ref("README.md", "file", `README is substantial (${f.readmeLength} chars)`));
      }
    }
    if (f.hasLicense) {
      score += 4;
      evidence.push(...ref("LICENSE", "file", "License file present"));
    }
    if (f.hasContributing) {
      score += 3;
      evidence.push(...ref("CONTRIBUTING.md", "file", "Contributor guide present"));
    }
    if (f.hasChangelog) {
      score += 3;
      evidence.push(...ref("CHANGELOG.md", "file", "Changelog present"));
    }
    return {
      dimension: "documentation",
      score: clamp(score, max),
      max,
      rationale: this.docsRationale(f),
      evidence,
    };
  }

  private docsRationale(f: RepoFacts): string {
    if (!f.hasReadme) return "Missing README makes onboarding and valuation opaque.";
    if (f.readmeLength < 300) return "README exists but is too short to convey intent or usage.";
    return "Documentation signals are healthy.";
  }

  private architecture(f: RepoFacts): DimensionScore {
    const max = DIMENSION_MAX.architecture;
    let score = 0;
    const evidence: EvidenceRef[] = [];
    if (f.manifest.exists) {
      score += 6;
      evidence.push(...ref(f.manifest.path, "file", "Manifest present defines module boundaries"));
    }
    if (f.fileCount >= 5) score += 4;
    if (f.fileCount >= 20) score += 4;
    if (f.fileCount >= 100) score += 4;
    if (f.fileCount > 2000) score -= 6;
    const rationale = f.fileCount > 2000
      ? `Very large codebase (${f.fileCount} files) suggests monolithic structure or vendored artifacts.`
      : f.fileCount >= 20
        ? `Modular structure indicated by ${f.fileCount} source files.`
        : `Small codebase (${f.fileCount} files); architecture is simple or under-documented.`;
    return {
      dimension: "architecture",
      score: clamp(score, max),
      max,
      rationale,
      evidence,
    };
  }

  private tests(f: RepoFacts): DimensionScore {
    const max = DIMENSION_MAX.tests;
    let score = 0;
    const evidence: EvidenceRef[] = [];
    if (f.hasTests) {
      score += 10;
      evidence.push(...f.testGlobs.slice(0, 3).flatMap((g) => ref(g, "test", "Test source detected")));
      if (f.hasCiConfig) {
        score += 8;
        evidence.push(...ref(".github/workflows", "build", "CI runs the test suite"));
      }
    }
    const rationale = f.hasTests
      ? f.hasCiConfig
        ? "Tests exist and are enforced in CI."
        : "Tests exist but are not wired into CI, allowing regressions to slip."
      : "No tests detected; correctness cannot be independently verified.";
    return {
      dimension: "tests",
      score: clamp(score, max),
      max,
      rationale,
      evidence,
    };
  }

  private deps(f: RepoFacts): DimensionScore {
    const max = DIMENSION_MAX.dependencies;
    let score = 0;
    const evidence: EvidenceRef[] = [];
    if (f.hasLockfile) {
      score += 6;
      evidence.push(...ref(f.manifest.path, "file", "Lockfile pins transitive versions"));
    }
    const depCount = f.dependencyCount;
    if (depCount > 0 && depCount <= 30) {
      score += 7;
      evidence.push(...ref(f.manifest.path, "file", `Reasonable dependency count (${depCount})`));
    } else if (depCount > 100) {
      score -= 4;
    }
    const rationale = depCount === 0
      ? "No dependencies; either self-contained or dependency listing is missing."
      : depCount > 100
        ? `${depCount} dependencies is a large surface area; supply-chain risk is high.`
        : `${depCount} dependencies with ${f.hasLockfile ? "pinned" : "unpinned"} versions.`;
    return {
      dimension: "dependencies",
      score: clamp(score, max),
      max,
      rationale,
      evidence,
    };
  }

  private build(f: RepoFacts): DimensionScore {
    const max = DIMENSION_MAX.build;
    let score = 0;
    const evidence: EvidenceRef[] = [];
    if (f.manifest.exists) {
      score += 5;
      evidence.push(...ref(f.manifest.path, "build", "Build entry defined in manifest"));
    }
    if (f.hasCiConfig) {
      score += 5;
      evidence.push(...ref(".github/workflows", "build", "Automated build pipeline present"));
    }
    if (f.hasLintConfig) {
      score += 5;
      evidence.push(...ref(".eslintrc", "lint", "Lint/format configuration present"));
    }
    const rationale = f.hasCiConfig
      ? "Build and CI are automated."
      : "No CI config found; builds depend on undocumented local steps.";
    return {
      dimension: "build",
      score: clamp(score, max),
      max,
      rationale,
      evidence,
    };
  }

  private maintenance(f: RepoFacts): DimensionScore {
    const max = DIMENSION_MAX.maintenance;
    let score = 0;
    const evidence: EvidenceRef[] = [];
    if (f.manifest.version) {
      score += 4;
      evidence.push(...ref(f.manifest.path, "file", `Versioned (${f.manifest.version})`));
    }
    if (f.hasLicense) {
      score += 3;
      evidence.push(...ref("LICENSE", "file", "Clear licensing reduces maintenance/adoption risk"));
    }
    if (f.hasLintConfig) {
      score += 3;
      evidence.push(...ref(".eslintrc", "lint", "Style consistency enforced"));
    }
    return {
      dimension: "maintenance",
      score: clamp(score, max),
      max,
      rationale: "Maintenance signals derived from versioning, licensing, and style enforcement.",
      evidence,
    };
  }
}