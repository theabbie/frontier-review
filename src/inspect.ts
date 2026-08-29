import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  RepositorySource,
  EvidenceRef,
  Language,
} from "./types.js";

export interface ManifestInfo {
  readonly exists: boolean;
  readonly path: string | null;
  readonly name: string | null;
  readonly version: string | null;
  readonly description: string | null;
  readonly license: string | null;
  readonly dependencies: readonly string[];
  readonly devDependencies: readonly string[];
}

export interface RepoFacts {
  readonly repoName: string;
  readonly root: string;
  readonly hasReadme: boolean;
  readonly readmeLength: number;
  readonly fileCount: number;
  readonly hasTests: boolean;
  readonly testGlobs: readonly string[];
  readonly hasLintConfig: boolean;
  readonly hasCiConfig: boolean;
  readonly manifest: ManifestInfo;
  readonly dependencyCount: number;
  readonly hasLockfile: boolean;
  readonly hasLicense: boolean;
  readonly hasChangelog: boolean;
  readonly hasContributing: boolean;
  readonly language: Language;
}

const README_NAMES = ["readme.md", "readme", "readme.txt", "readme.rst"];
const LINT_NAMES = [
  "eslint.config.js",
  "eslint.config.mjs",
  ".eslintrc",
  ".eslintrc.js",
  ".eslintrc.json",
  ".prettierrc",
  ".prettierrc.json",
  "ruff.toml",
  ".flake8",
  "clippy.toml",
  "golangci.yml",
  ".golangci.yml",
];
const CI_PATHS = [".github/workflows", ".gitlab-ci.yml", "azure-pipelines.yml"];
const LOCKFILES = [
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "poetry.lock",
  "uv.lock",
  "pipfile.lock",
  "go.sum",
  "cargo.lock",
  "requirements.txt",
];
const LICENSE_NAMES = ["license", "license.md", "license.txt", "copying"];
const TEST_GLOBS = [
  "**/*.test.ts",
  "**/*.test.js",
  "**/*.spec.ts",
  "**/*.spec.js",
  "**/test_*.py",
  "**/*_test.py",
  "**/*_test.go",
  "**/tests/**",
  "**/__tests__/**",
  "**/src/test/**",
  "**/src/test/java/**",
];

function detectLanguage(root: string, files: readonly string[]): Language {
  const names = new Set(files.map((f) => path.basename(f).toLowerCase()));
  const ext = new Set(files.map((f) => path.extname(f).toLowerCase()));
  if (ext.has(".ts")) return "typescript";
  if (ext.has(".js") || ext.has(".jsx")) return "javascript";
  if (ext.has(".py")) return "python";
  if (ext.has(".go")) return "go";
  if (ext.has(".rs")) return "rust";
  if (ext.has(".java")) return "java";
  if (ext.has(".cpp") || ext.has(".hpp") || ext.has(".c")) return "cpp";
  if (names.has("cargo.toml")) return "rust";
  if (names.has("go.mod")) return "go";
  return "other";
}

function findManifest(root: string, files: readonly string[]): string | null {
  const names = new Set(files.map((f) => path.basename(f).toLowerCase()));
  for (const candidate of [
    "package.json",
    "pyproject.toml",
    "setup.py",
    "go.mod",
    "cargo.toml",
    "pom.xml",
    "build.gradle",
    "cmakelists.txt",
  ]) {
    if (names.has(candidate)) return candidate;
  }
  return null;
}

async function safeRead(file: string): Promise<string | null> {
  try {
    return await fs.readFile(file, "utf8");
  } catch {
    return null;
  }
}

async function parseManifest(manifestPath: string): Promise<ManifestInfo> {
  const content = await safeRead(manifestPath);
  if (content === null) {
    return {
      exists: false,
      path: null,
      name: null,
      version: null,
      description: null,
      license: null,
      dependencies: [],
      devDependencies: [],
    };
  }
  const base = path.basename(manifestPath).toLowerCase();
  if (base === "package.json") {
    try {
      const json = JSON.parse(content) as Record<string, unknown>;
      const deps = json.dependencies as Record<string, string> | undefined;
      const dev = json.devDependencies as Record<string, string> | undefined;
      return {
        exists: true,
        path: manifestPath,
        name: (json.name as string) ?? null,
        version: (json.version as string) ?? null,
        description: (json.description as string) ?? null,
        license: (json.license as string) ?? null,
        dependencies: deps ? Object.keys(deps) : [],
        devDependencies: dev ? Object.keys(dev) : [],
      };
    } catch {
      return emptyManifest(manifestPath);
    }
  }
  return emptyManifest(manifestPath);
}

function emptyManifest(manifestPath: string): ManifestInfo {
  return {
    exists: true,
    path: manifestPath,
    name: null,
    version: null,
    description: null,
    license: null,
    dependencies: [],
    devDependencies: [],
  };
}

export class RepoInspector {
  async gather(source: RepositorySource): Promise<RepoFacts> {
    const root = source.path;
    const files = await this.walk(root);
    const relative = files.map((f) => path.relative(root, f));

    const names = new Set(relative.map((f) => path.basename(f).toLowerCase()));
    const manifestRelative = findManifest(root, relative);
    const manifest = manifestRelative
      ? await parseManifest(path.join(root, manifestRelative))
      : {
          exists: false,
          path: null,
          name: null,
          version: null,
          description: null,
          license: null,
          dependencies: [] as string[],
          devDependencies: [] as string[],
        };

    const readmeFile = [...names].find((n) => README_NAMES.includes(n));
    let readmeLength = 0;
    if (readmeFile) {
      const full = relative.find(
        (f) => path.basename(f).toLowerCase() === readmeFile,
      );
      if (full) {
        const content = (await safeRead(path.join(root, full))) ?? "";
        readmeLength = content.length;
      }
    }

    const testGlobs = TEST_GLOBS.filter((glob) =>
      relative.some((f) => f.includes(glob.replace("**/", "").replace("/**", ""))),
    );

    const hasTests =
      relative.some((f) => /\.(test|spec)\./.test(path.basename(f))) ||
      relative.some((f) => /\btests?\//.test(f) || /__tests__\//.test(f));

    const lintNames = names;
    const hasLintConfig = LINT_NAMES.some((n) => lintNames.has(n.toLowerCase()));

    const hasCiConfig = CI_PATHS.some((p) =>
      relative.some((f) => f.replaceAll(path.sep, "/").startsWith(p) || f.includes(p)),
    );

    const hasLockfile = LOCKFILES.some(
      (l) => names.has(l) || relative.some((f) => f.endsWith(l)),
    );

    const hasLicense = LICENSE_NAMES.some((n) => lintNames.has(n.toLowerCase()));

    return {
      repoName: source.name,
      root,
      hasReadme: readmeFile !== undefined,
      readmeLength,
      fileCount: files.length,
      hasTests,
      testGlobs,
      hasLintConfig,
      hasCiConfig,
      manifest,
      dependencyCount: manifest.dependencies.length + manifest.devDependencies.length,
      hasLockfile,
      hasLicense,
      hasChangelog: names.has("changelog.md") || names.has("changelog"),
      hasContributing: names.has("contributing.md"),
      language: detectLanguage(root, relative),
    };
  }

  private async walk(dir: string): Promise<string[]> {
    const out: string[] = [];
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return out;
    }
    for (const entry of entries) {
      if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "dist" || entry.name === "target") {
        continue;
      }
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        out.push(...(await this.walk(full)));
      } else {
        out.push(full);
      }
    }
    return out;
  }
}