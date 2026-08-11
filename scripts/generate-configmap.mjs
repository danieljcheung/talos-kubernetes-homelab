#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const REPO_ROOT = path.resolve(__dirname, '..');
export const DEFAULT_DIST_DIR = path.join(REPO_ROOT, 'site', 'dist');
export const DEFAULT_CONFIGMAP_PATH = path.join(REPO_ROOT, 'manifests', 'nginx', 'configmap.yaml');

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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Check for section transitions
    if (line.startsWith('data:')) {
      currentSection = 'data';
      result.dataLines = [];
      continue;
    } else if (line.startsWith('binaryData:')) {
      currentSection = 'binaryData';
      result.binaryDataLines = [];
      continue;
    }

    if (currentSection === 'header') {
      result.headerLines.push(line);
    } else if (currentSection === 'data') {
      result.dataLines.push(line);
    } else if (currentSection === 'binaryData') {
      result.binaryDataLines.push(line);
    }
  }

  return result;
}

export function generateConfigMapYaml(parsed, newFiles) {
  let yaml = '';
  // Header lines
  yaml += parsed.headerLines.join('\n');
  if (parsed.headerLines.length > 0 && !yaml.endsWith('\n')) {
    yaml += '\n';
  }
  // data section
  yaml += 'data:\n';
  for (const [filename, content] of Object.entries(newFiles)) {
    yaml += `  ${filename}: |\n`;
    const lines = content.replace(/\r/g, '').split('\n');
    if (lines.length > 0 && lines[lines.length - 1] === '') {
      lines.pop();
    }
    const indented = lines.map(line => line.length > 0 ? `    ${line}` : '').join('\n');
    yaml += indented + '\n';
  }
  // binaryData section
  if (parsed.binaryDataLines) {
    yaml += 'binaryData:\n';
    yaml += parsed.binaryDataLines.join('\n');
    if (parsed.binaryDataLines.length > 0 && !yaml.endsWith('\n')) {
      yaml += '\n';
    }
  }
  return yaml;
}

export function runSyncOrCheck({ configMapPath, distDir, checkMode, fsInject = fs }) {
  const requiredFiles = {
    'index.html': path.join(distDir, 'index.html'),
    'app.js': path.join(distDir, 'assets', 'app.js'),
    'app.css': path.join(distDir, 'assets', 'app.css'),
  };

  // 1. Verify build outputs exist
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
    throw new Error(`Missing build output files:\n${missingFiles.map(f => `  - ${f}`).join('\n')}`);
  }

  // 2. Read existing ConfigMap
  if (!fsInject.existsSync(configMapPath)) {
    throw new Error(`ConfigMap file not found at: ${configMapPath}`);
  }
  const originalYaml = fsInject.readFileSync(configMapPath, 'utf8');

  // 3. Parse existing ConfigMap
  const parsed = parseConfigMap(originalYaml);

  // 4. Generate new YAML
  const newYaml = generateConfigMapYaml(parsed, fileContents);

  // 5. Compare or Write
  if (checkMode) {
    if (originalYaml !== newYaml) {
      throw new Error('ConfigMap is stale. Run generator to sync.');
    }
    return { status: 'up-to-date', message: 'Success: ConfigMap is up to date and consistent with build outputs.' };
  } else {
    fsInject.writeFileSync(configMapPath, newYaml, 'utf8');
    return { status: 'written', message: `Success: Generated ${configMapPath} from build outputs.` };
  }
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
