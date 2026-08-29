# Reproduction Guide

A clean-machine walkthrough from zero to the main result. No API keys or network
dependencies are required.

## 0. Environment

| Component | Version (tested) |
|-----------|------------------|
| Node.js   | 20.19.4          |
| npm       | 10.8.2           |
| TypeScript| 5.7.3            |

## 1. Clone and install

```bash
git clone <this-repo> && cd frontier-review
npm install
```

## 2. Obtain evaluation repositories

The evaluation uses 10 public repositories. Clone your own shallow copies (the names
match `data/repos.json`):

```bash
mkdir -p data/repos
git clone --depth 1 https://github.com/axios/axios.git data/repos/axios_axios
git clone --depth 1 https://github.com/expressjs/express.git data/repos/expressjs_express
git clone --depth 1 https://github.com/fastify/fastify.git data/repos/fastify_fastify
git clone --depth 1 https://github.com/lodash/lodash.git data/repos/lodash_lodash
git clone --depth 1 https://github.com/microsoft/TypeScript.git data/repos/microsoft_TypeScript
git clone --depth 1 https://github.com/prettier/prettier.git data/repos/prettier_prettier
git clone --depth 1 https://github.com/reactjs/react.dev.git data/repos/reactjs_react.dev
git clone --depth 1 https://github.com/sindresorhus/awesome.git data/repos/sindresorhus_awesome
git clone --depth 1 https://github.com/sindresorhus/got.git data/repos/sindresorhus_got
git clone --depth 1 https://github.com/vuejs/vue.git data/repos/vuejs_vue
```

## 3. Build and test

```bash
npm run build
npm test            # expect: 6 passing tests
```

## 4. Run the baseline

```bash
node dist/cli/review.js data/repos/axios_axios baseline
```

Expect a Markdown report where each dimension carries at most **half** its maximum
(binary presence checks only).

## 5. Run the agent workflow

```bash
node dist/cli/review.js data/repos/axios_axios agent
```

Expect an evidence-cited report: each dimension lists the `path:file` that supports it.

## 6. Run the full evaluation

```bash
node dist/cli/eval.js data/repos.json
```

This writes `data/evaluation-results.md`. The main result is the **average Δ score** in
the table footer — expected to be approximately **+28 points** (agent minus baseline).

## Expected output

```
| Repo | Agent Score | Baseline Score | Δ | ... |
...
**Average improvement: 27.9 points**
```

Exact integer scores are deterministic given the same repository snapshots (they depend
only on filesystem content, not wall-clock or model sampling).

## Approximate runtime and cost

- Full evaluation across 10 repos: **< 10 seconds**, **$0** (no model calls in the core
  path).
- Optional live-LLM baseline: variable cost depending on provider.