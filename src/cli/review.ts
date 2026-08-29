import { RepoInspector } from "../inspect.js";
import { RubricScorer } from "../score.js";
import { Baseline } from "../baseline.js";
import { renderMarkdown, renderJson } from "../report.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const repoPath = args[0];
  const mode = args[1] ?? "agent";
  if (!repoPath) {
    console.error("Usage: review <repo-path> [agent|baseline]");
    process.exit(1);
  }
  const inspector = new RepoInspector();
  const facts = await inspector.gather({ name: repoPath, path: repoPath });

  if (mode === "baseline") {
    const baseline = new Baseline();
    const result = await baseline.run(facts);
    console.log(renderMarkdown(result.assessment));
    return;
  }

  const scorer = new RubricScorer();
  const assessment = scorer.score(facts);
  console.log(renderMarkdown(assessment));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});