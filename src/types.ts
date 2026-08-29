export type Language =
  | "typescript"
  | "javascript"
  | "python"
  | "java"
  | "go"
  | "rust"
  | "cpp"
  | "other";

export interface RepositorySource {
  readonly name: string;
  readonly path: string;
  readonly languageHint?: Language;
}

export interface EvidenceRef {
  readonly path: string;
  readonly kind: "file" | "test" | "build" | "lint";
  readonly note: string;
}

export interface DimensionScore {
  readonly dimension: DimensionName;
  readonly score: number;
  readonly max: number;
  readonly rationale: string;
  readonly evidence: readonly EvidenceRef[];
}

export interface Assessment {
  readonly repoName: string;
  readonly dimensions: readonly DimensionScore[];
  readonly totalScore: number;
  readonly maxTotal: number;
  readonly grade: Grade;
  readonly summary: string;
  readonly generatedAt: string;
}

export type DimensionName =
  | "documentation"
  | "architecture"
  | "tests"
  | "dependencies"
  | "build"
  | "maintenance";

export type Grade = "A" | "B" | "C" | "D" | "F";

export const DIMENSIONS: readonly DimensionName[] = [
  "documentation",
  "architecture",
  "tests",
  "dependencies",
  "build",
  "maintenance",
];

export const DIMENSION_MAX: Record<DimensionName, number> = {
  documentation: 20,
  architecture: 20,
  tests: 20,
  dependencies: 15,
  build: 15,
  maintenance: 10,
};

export const MAX_TOTAL: number = Object.values(DIMENSION_MAX).reduce(
  (a, b) => a + b,
  0,
);