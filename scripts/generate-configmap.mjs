#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const REPO_ROOT = path.resolve(__dirname, '..');
export const DEFAULT_DIST_DIR = path.join(REPO_ROOT, 'site', 'dist');
export const DEFAULT_CONFIGMAP_PATH = path.join(REPO_ROOT, 'manifests', 'nginx', 'configmap.yaml');
export const CONFIGMAP_SIZE_LIMIT_BYTES = 1024 * 1024;
export const BASE64_LINE_WIDTH = 76;

// Cozy intentionally has a small, fixed binary-asset contract. Keep these
// names as ConfigMap keys; the Deployment maps each key below /assets/.
export const COZY_BINARY_ASSET_NAMES = Object.freeze([
  'cozy-calendar.webp',
  'cozy-connect.webp',
  'cozy-download.webp',
  'cozy-hero.webp',
  'cozy-sapling.webp',
  'cozy-user.webp'
]);

/**
 * Resolve a CLI path relative to the repository rather than the caller's cwd.
 * Absolute paths remain absolute while `.` and `..` segments are normalized.
 */
export function normalizeRepoPath(value, repoRoot = REPO_ROOT) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error('Path values must be non-empty strings.');
  }
  return path.resolve(repoRoot, value);
}

/**
 * Parse generator flags without reading process state. This keeps the CLI
 * contract directly testable and makes all relative paths repository-rooted.
 */
export function parseCliArgs(args = process.argv.slice(2), repoRoot = REPO_ROOT) {
  let checkMode = false;
  let distValue;
  let configMapValue;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--check') {
      checkMode = true;
      continue;
    }

    const equalsIndex = argument.indexOf('=');
    const flag = equalsIndex === -1 ? argument : argument.slice(0, equalsIndex);
    const inlineValue = equalsIndex === -1 ? undefined : argument.slice(equalsIndex + 1);
    if (flag === '--dist' || flag === '--configmap') {
      const value = inlineValue ?? args[++index];
      if (!value || value.startsWith('--')) {
        throw new Error(`${flag} requires a path value.`);
      }
      if (flag === '--dist') {
        distValue = value;
      } else {
        configMapValue = value;
      }
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  return {
    checkMode,
    distDir: normalizeRepoPath(distValue ?? path.join(repoRoot, 'site', 'dist'), repoRoot),
    configMapPath: normalizeRepoPath(configMapValue ?? path.join(repoRoot, 'manifests', 'nginx', 'configmap.yaml'), repoRoot)
  };
}

// Exporting functions for unit testing
export function parseConfigMap(yamlText) {
  const lines = yamlText.split(/\r?\n/);
  const result = {
    headerLines: [],
    dataLines: null,
    binaryDataLines: null,
  };

  let currentSection = 'header'; // 'header', 'data', 'binaryData'

  for (const line of lines) {
    if (line.startsWith('data:')) {
      currentSection = 'data';
      result.dataLines = [];
      continue;
    }
    if (line.startsWith('binaryData:')) {
      currentSection = 'binaryData';
      result.binaryDataLines = [];
      continue;
    }

    if (currentSection === 'header') {
      result.headerLines.push(line);
    } else if (currentSection === 'data') {
      result.dataLines.push(line);
    } else {
      result.binaryDataLines.push(line);
    }
  }

  return result;
}

const DATA_KEY_ORDER = Object.freeze(['index.html', 'app.js', 'app.css']);

function compareKeys(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareDataKeys([left], [right]) {
  const leftIndex = DATA_KEY_ORDER.indexOf(left);
  const rightIndex = DATA_KEY_ORDER.indexOf(right);
  if (leftIndex !== -1 || rightIndex !== -1) {
    if (leftIndex === -1) return 1;
    if (rightIndex === -1) return -1;
    return leftIndex - rightIndex;
  }
  return compareKeys(left, right);
}

function appendTextData(yaml, newFiles) {
  const entries = Object.entries(newFiles).sort(compareDataKeys);
  for (const [filename, content] of entries) {
    yaml += `  ${filename}: |\n`;
    const lines = String(content).replace(/\r/g, '').split('\n');
    if (lines.length > 0 && lines[lines.length - 1] === '') {
      lines.pop();
    }
    yaml += lines.map((line) => line.length > 0 ? `    ${line}` : '').join('\n');
    yaml += '\n';
  }
  return yaml;
}

function binaryValueToBuffer(value) {
  if (Buffer.isBuffer(value)) {
    return value;
  }
  if (value instanceof Uint8Array) {
    return Buffer.from(value);
  }
  if (typeof value === 'string') {
    return Buffer.from(value);
  }
  throw new TypeError('Binary asset contents must be a Buffer, Uint8Array, or string.');
}

export function renderBinaryData(binaryFiles) {
  let yaml = '';
  for (const [filename, value] of Object.entries(binaryFiles).sort(([left], [right]) => compareKeys(left, right))) {
    const encoded = binaryValueToBuffer(value).toString('base64');
    yaml += `  ${filename}: |\n`;
    if (encoded.length === 0) {
      yaml += '    \n';
      continue;
    }
    for (let index = 0; index < encoded.length; index += BASE64_LINE_WIDTH) {
      yaml += `    ${encoded.slice(index, index + BASE64_LINE_WIDTH)}\n`;
    }
  }
  return yaml;
}

export function assertConfigMapSize(yaml, maxBytes = CONFIGMAP_SIZE_LIMIT_BYTES) {
  const byteLength = Buffer.byteLength(yaml, 'utf8');
  if (byteLength >= maxBytes) {
    throw new Error(
      `ConfigMap output is ${byteLength} bytes; it must remain below ${maxBytes} bytes (1 MiB Kubernetes limit).`
    );
  }
  return byteLength;
}

export function generateConfigMapYaml(parsed, newFiles, binaryFiles) {
  let yaml = parsed.headerLines.join('\n');
  if (parsed.headerLines.length > 0 && !yaml.endsWith('\n')) {
    yaml += '\n';
  }

  yaml += 'data:\n';
  yaml = appendTextData(yaml, newFiles);

  if (binaryFiles !== undefined) {
    yaml += 'binaryData:\n';
    yaml += renderBinaryData(binaryFiles);
  } else if (parsed.binaryDataLines) {
    // The portfolio ConfigMap owns a pre-existing resume PDF. Preserve its
    // block scalar byte-for-byte unless a build explicitly supplies binaries.
    yaml += 'binaryData:\n';
    yaml += parsed.binaryDataLines.join('\n');
    if (parsed.binaryDataLines.length > 0 && !yaml.endsWith('\n')) {
      yaml += '\n';
    }
  }

  assertConfigMapSize(yaml);
  return yaml;
}

function walkFiles(directory, rootDirectory, fsInject) {
  const entries = fsInject.readdirSync(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const name = typeof entry === 'string' ? entry : entry.name;
    const absolutePath = path.join(directory, name);
    const relativePath = path.relative(rootDirectory, absolutePath).split(path.sep).join('/');
    const isDirectory = typeof entry !== 'string'
      && typeof entry.isDirectory === 'function'
      && entry.isDirectory();
    if (isDirectory) {
      files.push(...walkFiles(absolutePath, rootDirectory, fsInject));
    } else {
      files.push({ absolutePath, relativePath });
    }
  }
  return files;
}

export function discoverBinaryAssets({ distDir, expectedAssetNames = COZY_BINARY_ASSET_NAMES, fsInject = fs }) {
  const assetFiles = walkFiles(distDir, distDir, fsInject).sort(
    ({ relativePath: left }, { relativePath: right }) => compareKeys(left, right)
  );
  const expectedNames = [...new Set(expectedAssetNames)].sort(compareKeys);
  const expectedPaths = expectedNames.map((name) => `assets/${name}`);
  const actualPaths = new Set(assetFiles.map(({ relativePath }) => relativePath));
  const allowedPaths = new Set([
    'index.html',
    'assets/app.js',
    'assets/app.css',
    ...expectedPaths
  ]);
  const missing = expectedPaths.filter((relativePath) => !actualPaths.has(relativePath));
  const unexpected = assetFiles
    .filter(({ relativePath }) => !allowedPaths.has(relativePath))
    .map(({ relativePath }) => relativePath);
  if (missing.length > 0) {
    throw new Error(`Missing binary asset files:\n${missing.map((file) => `  - ${file}`).join('\n')}`);
  }
  if (unexpected.length > 0) {
    throw new Error(
      `Unexpected Cozy build assets (the generator would omit them):\n${unexpected.map((file) => `  - ${file}`).join('\n')}`
    );
  }

  return Object.fromEntries(expectedPaths.map((relativePath) => {
    const file = assetFiles.find(({ relativePath: candidate }) => candidate === relativePath);
    return [path.basename(relativePath), fsInject.readFileSync(file.absolutePath)];
  }));
}

function usesCozyBinaryContract(distDir, configMapPath) {
  return path.basename(path.resolve(distDir)) === 'dist-cozy'
    || path.normalize(configMapPath).split(path.sep).includes('cozy-friends-site');
}

export function runSyncOrCheck({
  configMapPath,
  distDir,
  checkMode,
  binaryAssetNames,
  fsInject = fs
}) {
  const requiredFiles = {
    'index.html': path.join(distDir, 'index.html'),
    'app.js': path.join(distDir, 'assets', 'app.js'),
    'app.css': path.join(distDir, 'assets', 'app.css'),
  };

  const missingFiles = [];
  const fileContents = {};
  for (const [key, filePath] of Object.entries(requiredFiles)) {
    if (!fsInject.existsSync(filePath)) {
      missingFiles.push(filePath);
    } else {
      fileContents[key] = fsInject.readFileSync(filePath, 'utf8');
    }
  }
  if (missingFiles.length > 0) {
    throw new Error(`Missing build output files:\n${missingFiles.map((file) => `  - ${file}`).join('\n')}`);
  }

  const expectedBinaryNames = binaryAssetNames
    ?? (usesCozyBinaryContract(distDir, configMapPath) ? COZY_BINARY_ASSET_NAMES : []);
  const binaryFiles = expectedBinaryNames.length > 0
    ? discoverBinaryAssets({ distDir, expectedAssetNames: expectedBinaryNames, fsInject })
    : undefined;

  if (!fsInject.existsSync(configMapPath)) {
    throw new Error(`ConfigMap file not found at: ${configMapPath}`);
  }
  const originalYaml = fsInject.readFileSync(configMapPath, 'utf8');
  const parsed = parseConfigMap(originalYaml);
  const newYaml = generateConfigMapYaml(parsed, fileContents, binaryFiles);

  if (checkMode) {
    if (originalYaml !== newYaml) {
      throw new Error('ConfigMap is stale. Run generator to sync.');
    }
    return { status: 'up-to-date', message: 'Success: ConfigMap is up to date and consistent with build outputs.' };
  }

  fsInject.writeFileSync(configMapPath, newYaml, 'utf8');
  return { status: 'written', message: `Success: Generated ${configMapPath} from build outputs.` };
}

// CLI runner
async function main() {
  // If imported as a module in tests, do not auto-run.
  if (path.resolve(process.argv[1] ?? '') !== __filename) {
    return;
  }

  try {
    const { checkMode, configMapPath, distDir } = parseCliArgs();
    const result = runSyncOrCheck({ configMapPath, distDir, checkMode });
    console.log(result.message);
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Unhandled error: ${message}`);
  process.exit(1);
});
