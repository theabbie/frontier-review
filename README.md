# frontier-review

Agentic code-quality assessment: a fair, evidence-backed comparison between a naive
single-prompt baseline and a multi-step agentic workflow for evaluating whether an
unfamiliar code repository is actually good.

Built for the micro1 **Agentic Workflows Hackathon** (Frontier Engineering Challenge 2026).

---

## The problem

> **Who has this problem?** A team or buyer evaluating an unfamiliar code repository —
> for example, deciding whether to adopt a dependency, purchase a private codebase, or
> onboard onto a legacy project.

> **What bottleneck makes it worth solving?** A README and a working demo reveal almost
> nothing about the *quality* of the code underneath. Understanding an unfamiliar
> codebase means checking tests, build tooling, architecture, dependencies, and
> maintenance signals — and different reviewers interpret the same signals differently.
> Without a repeatable method, the verdict depends on incomplete or inconsistent judgment.

> **Why is solving it valuable?** A reproducible, evidence-tied assessment lets a team
> make a fair, defensible decision before committing money or engineering time.

---

## Architecture

```
src/
  inspect.ts      Deterministic repository facts gathering (structure, tests, CI, deps)
  score.ts        Rubric scorer: turns facts into dimension scores with evidence refs
  baseline.ts     The naive "one direct prompt" baseline (deterministic, no LLM key)
  report.ts       Markdown / JSON report rendering
  types.ts        Shared domain types + the scoring rubric
  cli/review.ts   CLI: `review <repo-path> [agent|baseline]`
  cli/eval.ts     CLI: run agent vs baseline across a list of repos, emit comparison
tests/
  core.test.ts    Unit tests for inspector, scorer, baseline, and report
fixtures/
  good-repo/      A synthetic well-maintained repo for deterministic tests
  bad-repo/       A synthetic poorly-maintained repo for deterministic tests
```

**Why deterministic by default?** The core workflow needs no LLM API key or network, so
another person can reproduce the result from a clean machine with zero secrets. The
baseline represents the naive "single direct prompt" that the challenge defines as the
comparison point; both the agent and baseline run against the *same* facts and cases.

---

## Prerequisites

- Node.js **20+** (tested on 20.19.4)
- `npm` (tested on 10.8.2)

No API keys, database, or external services are required to run or reproduce the result.

---

## Installation

```bash
git clone <this-repo>
cd frontier-review
npm install
```

---

## Local development

```bash
npm run build        # compile TypeScript to dist/
npm run typecheck    # type-check without emitting
npm test             # run the unit test suite
```

---

## Running the assessment

### Single repository (agent workflow)

```bash
npm run build
node dist/cli/review.js <path-to-repo> agent      # agentic, evidence-backed report
node dist/cli/review.js <path-to-repo> baseline   # naive single-prompt baseline
```

Example:

```bash
node dist/cli/review.js fixtures/good-repo agent
```

### Full evaluation (agent vs baseline across many repos)

```bash
node dist/cli/eval.js data/repos.json
```

`data/repos.json` is a JSON array of `{ name, path }` entries. The evaluation writes a
Markdown comparison table to `data/evaluation-results.md`.

---

## Testing

```bash
npm test
```

Runs the unit test suite (6 tests) covering the inspector, rubric scorer, baseline, and
report renderer against the synthetic fixtures.

---

## Known constraints

- Repository snapshots under `data/repos/` are not committed (see `.gitignore`); clone
  your own copies with `git clone --depth 1` to reproduce the evaluation.
- The rubric is deliberately simple and deterministic so the result is reproducible; it
  prioritizes *transparent, evidence-tied* scores over model-generated free text.
- The baseline uses a deterministic heuristic named "single direct prompt". A real LLM
  can be plugged in via the `LlmProvider` interface in `src/baseline.ts` without
  changing the comparison shape.

---

## License

TBD