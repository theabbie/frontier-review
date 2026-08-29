import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RepoInspector } from "../src/inspect.js";
import { RubricScorer } from "../src/score.js";
import { Baseline } from "../src/baseline.js";
import { renderMarkdown, renderJson } from "../src/report.js";
import { MAX_TOTAL } from "../src/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.resolve(__dirname, "..", "fixtures");

test("inspector gathers facts from a good repo", async () => {
  const inspector = new RepoInspector();
  const facts = await inspector.gather({
    name: "good-repo",
    path: path.join(fixtures, "good-repo"),
  });
  assert.equal(facts.hasReadme, true);
  assert.equal(facts.hasTests, true);
  assert.equal(facts.hasCiConfig, true);
  assert.equal(facts.hasLintConfig, true);
  assert.equal(facts.hasLicense, true);
  assert.equal(facts.language, "typescript");
  assert.ok(facts.dependencyCount >= 2);
});

test("inspector gathers facts from a bad repo", async () => {
  const inspector = new RepoInspector();
  const facts = await inspector.gather({
    name: "bad-repo",
    path: path.join(fixtures, "bad-repo"),
  });
  assert.equal(facts.hasReadme, false);
  assert.equal(facts.hasTests, false);
  assert.equal(facts.hasLicense, false);
});

test("scorer produces higher score for good repo than bad repo", async () => {
  const inspector = new RepoInspector();
  const scorer = new RubricScorer();
  const good = scorer.score(
    await inspector.gather({ name: "good-repo", path: path.join(fixtures, "good-repo") }),
  );
  const bad = scorer.score(
    await inspector.gather({ name: "bad-repo", path: path.join(fixtures, "bad-repo") }),
  );
  assert.ok(good.totalScore > bad.totalScore, `${good.totalScore} > ${bad.totalScore}`);
  assert.equal(good.maxTotal, MAX_TOTAL);
});

test("scorer dimensions sum to total and stay within max", async () => {
  const inspector = new RepoInspector();
  const scorer = new RubricScorer();
  const facts = await inspector.gather({
    name: "good-repo",
    path: path.join(fixtures, "good-repo"),
  });
  const assessment = scorer.score(facts);
  const sum = assessment.dimensions.reduce((a, d) => a + d.score, 0);
  assert.equal(sum, assessment.totalScore);
  for (const d of assessment.dimensions) {
    assert.ok(d.score >= 0 && d.score <= d.max, `${d.dimension} in range`);
  }
});

test("baseline produces a deterministic assessment", async () => {
  const inspector = new RepoInspector();
  const baseline = new Baseline();
  const facts = await inspector.gather({
    name: "good-repo",
    path: path.join(fixtures, "good-repo"),
  });
  const a = (await baseline.run(facts)).assessment;
  const b = (await baseline.run(facts)).assessment;
  assert.equal(a.totalScore, b.totalScore);
  assert.equal(a.maxTotal, MAX_TOTAL);
});

test("renderMarkdown and renderJson produce output", async () => {
  const inspector = new RepoInspector();
  const scorer = new RubricScorer();
  const facts = await inspector.gather({
    name: "good-repo",
    path: path.join(fixtures, "good-repo"),
  });
  const assessment = scorer.score(facts);
  const md = renderMarkdown(assessment);
  const json = renderJson(assessment);
  assert.ok(md.includes("Code Quality Assessment"));
  assert.ok(md.includes("# "));
  assert.ok(JSON.parse(json).repoName === "good-repo");
});