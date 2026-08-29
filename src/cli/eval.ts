import { promises as fs } from "node:fs";
import path from "node:path";
import { RepoInspector } from "../inspect.js";
import { RubricScorer } from "../score.js";
import { Baseline } from "../baseline.js";
import type { Assessment } from "../types.js";

interface Case {
  readonly name: string;
  readonly path: string;
}

export async function evaluateCases(cases: Case[]): Promise<
  { repo: string; agent: Assessment; baseline: Assessment }[]
> {
  const inspector = new RepoInspector();
  const scorer = new RubricScorer();
  const baseline = new Baseline();
  const out = [];
  for (const c of cases) {
    const facts = await inspector.gather({ name: c.name, path: c.path });
    const agent = scorer.score(facts);
    const base = (await baseline.run(facts)).assessment;
    out.push({ repo: c.name, agent, baseline: base });
  }
  return out;
}

async function main(): Promise<void> {
  const reposFile = process.argv[2];
  if (!reposFile) {
    console.error("Usage: eval <repos.json>");
    process.exit(1);
  }
  const raw = await fs.readFile(reposFile, "utf8");
  const cases = JSON.parse(raw) as Case[];
  const results = await evaluateCases(cases);

  let out = "# Evaluation: Agent vs Baseline\n\n";
  out += "| Repo | Agent Score | Baseline Score | Δ | Agent Grade | Baseline Grade |\n";
  out += "|------|-------------|----------------|---|-------------|----------------|\n";
  for (const r of results) {
    const delta = (r.agent.totalScore - r.baseline.totalScore).toFixed(0);
    out += `| ${r.repo} | ${r.agent.totalScore} | ${r.baseline.totalScore} | ${delta} | ${r.agent.grade} | ${r.baseline.grade} |\n`;
  }
  const avgDelta = results.reduce((a, r) => a + (r.agent.totalScore - r.baseline.totalScore), 0) / results.length;
  out += `\n**Average improvement: ${avgDelta.toFixed(1)} points**\n`;
  console.log(out);

  await fs.mkdir("data", { recursive: true });
  const outPath = path.join("data", "evaluation-results.md");
  await fs.writeFile(outPath, out, "utf8");
  console.error(`Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});