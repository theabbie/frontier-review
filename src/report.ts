import type { Assessment } from "./types.js";

export function renderMarkdown(assessment: Assessment): string {
  const lines: string[] = [];
  lines.push(`# Code Quality Assessment: ${assessment.repoName}`);
  lines.push("");
  lines.push(`**Overall grade:** ${assessment.grade}  `);
  lines.push(`**Score:** ${assessment.totalScore}/${assessment.maxTotal}  `);
  lines.push(`**Generated:** ${assessment.generatedAt}`);
  lines.push("");
  lines.push("## Dimensions");
  lines.push("");
  lines.push("| Dimension | Score | Max | Rationale |");
  lines.push("|-----------|-------|-----|-----------|");
  for (const d of assessment.dimensions) {
    lines.push(`| ${d.dimension} | ${d.score} | ${d.max} | ${d.rationale} |`);
  }
  lines.push("");
  lines.push("## Evidence");
  lines.push("");
  for (const d of assessment.dimensions) {
    if (d.evidence.length === 0) continue;
    lines.push(`### ${d.dimension}`);
    for (const e of d.evidence) {
      lines.push(`- \`${e.path}\` (${e.kind}): ${e.note}`);
    }
    lines.push("");
  }
  lines.push("## Summary");
  lines.push("");
  lines.push(assessment.summary || "No summary provided.");
  lines.push("");
  return lines.join("\n");
}

export function renderJson(assessment: Assessment): string {
  return JSON.stringify(assessment, null, 2);
}