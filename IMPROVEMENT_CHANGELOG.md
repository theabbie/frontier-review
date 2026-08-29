# Improvement Changelog

The story of how `frontier-review` evolved, from a naive single-prompt baseline to a
multi-step agentic workflow. Each entry ties an experiment to evidence (the evaluation
score) and the decision that followed.

Evaluation method (constant across all stages): score each of 10 public repositories
with the **same** six-dimension rubric and compare the agent's total against the
baseline's total across the same cases.

| STAGE | WHAT I TRIED AND WHY | EVIDENCE (avg Δ score) | DECISION / LEARNING |
|-------|----------------------|------------------------|---------------------|
| Baseline | A single direct prompt that checks only *presence* (README, tests, manifest) as binary signals. | avg Δ = **0.0** (baseline scored, by construction, the ceiling) | Established the starting point — but revealed the baseline was miscalibrated (full points for mere existence). |
| Iteration 1 | Collect richer *facts*: real file walking, manifest/version/license parsing, lockfile + CI + lint detection. | agent now distinguishes rad repos (axios 87) from weak ones (awesome 29) | Kept. Structured facts are the foundation every later step depends on. |
| Iteration 2 | Recalibrate the **baseline** to be genuinely naive: award at most *half* points for binary presence, since a one-shot prompt cannot judge depth, coverage, or risk. | baseline dropped from ~100 → ~49; gap became fair | Kept. This exposed a real lesson: a "fair" baseline must be *worse*, not just *different*. |
| Iteration 3 | Make every dimension **evidence-cited**: reference the exact file/build/test that supports each score. | agent report became auditable; no claim without a `path:file` ref | Kept. Reproducibility + judge trust both depend on this. |
| Iteration 4 | Add a **discriminating** risk signal: penalize very large codebases and dependency bloat, reward lockfiles + CI + versioning. | spread widened (good 87 vs got 67 vs awesome 29) | Kept. Differentiating quality is the whole point. |
| Final | Combine the above into a deterministic, dependency-free workflow that runs agent + baseline on the same cases and emits a comparison table. | **avg Δ = +27.9** points | Shipped. See `data/evaluation-results.md`. |

## The change that contributed most

Recalibrating the baseline to be *honestly naive* (Iteration 2), combined with
evidence-cited scoring (Iteration 3). Without the former the comparison is meaningless;
without the latter the agent's verdict is unverifiable. Together they make the
improvement both *real* and *auditable*.

## An experiment I removed

An early version awarded full dimension scores just for a file existing (e.g., README
present → 20/20 documentation). It made the naive baseline look nearly perfect and hid
the agent's value. Removing it was the single most consequential correction.

## Main failure mode

A fully *deterministic* rubric cannot read prose quality — a verbose but useless README
scores the same as an excellent one. The agent currently rewards *presence and structure*
more than *semantic usefulness.*

## Hot take

The hardest part of an agentic evaluation is not making the agent smarter — it is
making the *baseline honest enough* that the comparison means anything. A baseline that
over-credits shallow signals will flatter the status quo and erase your agent's real
value. Calibrate the baseline first, then measure.