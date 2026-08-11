import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {
  DEFAULT_CONFIGMAP_PATH,
  DEFAULT_DIST_DIR,
  generateConfigMapYaml,
  normalizeRepoPath,
  parseCliArgs,
  parseConfigMap,
  runSyncOrCheck
} from './generate-configmap.mjs';

// Helper to create a mock filesystem for runSyncOrCheck tests
function createMockFs(files) {
  return {
    existsSync(p) {
      return p in files;
    },
    readFileSync(p, encoding) {
      if (!(p in files)) {
        throw new Error(`ENOENT: no such file or directory, open '${p}'`);
      }
      return files[p];
    },

    writeFileSync(p, content, encoding) {
      files[p] = content;
    }
  };
}
test('parseCliArgs preserves portfolio defaults and check mode', () => {
  const parsed = parseCliArgs(['--check']);

  assert.equal(parsed.checkMode, true);
  assert.equal(parsed.distDir, DEFAULT_DIST_DIR);
  assert.equal(parsed.configMapPath, DEFAULT_CONFIGMAP_PATH);
});

test('parseCliArgs resolves --dist and --configmap relative to the repository root', () => {
  const repoRoot = '/mock/repository';
  const parsed = parseCliArgs([
    '--dist',
    'site/dist-cozy',
    '--configmap=manifests/cozy-friends-site/configmap.yaml'
  ], repoRoot);
  const defaults = parseCliArgs([], repoRoot);
  assert.equal(defaults.distDir, path.join(repoRoot, 'site', 'dist'));
  assert.equal(defaults.configMapPath, path.join(repoRoot, 'manifests', 'nginx', 'configmap.yaml'));

  assert.deepEqual(parsed, {
    checkMode: false,
    distDir: path.join(repoRoot, 'site', 'dist-cozy'),
    configMapPath: path.join(repoRoot, 'manifests', 'cozy-friends-site', 'configmap.yaml')
  });
  assert.equal(normalizeRepoPath('../shared', repoRoot), '/mock/shared');
});

test('parseCliArgs rejects unknown and incomplete options', () => {
  assert.throws(() => parseCliArgs(['--unknown']), /Unknown argument: --unknown/);
  assert.throws(() => parseCliArgs(['--dist']), /--dist requires a path value/);
  assert.throws(() => parseCliArgs(['--configmap', '--check']), /--configmap requires a path value/);
});

test('parseConfigMap splits header, data, and binaryData correctly', () => {
  const sampleYaml = `apiVersion: v1
kind: ConfigMap
metadata:
  name: test-config
  labels:
    app: test
data:
  index.html: |
    <html>hello</html>
  app.js: |
    console.log("hello");
binaryData:
  resume.pdf: |
    JVBERi0xLjcK`;

  const parsed = parseConfigMap(sampleYaml);

  assert.equal(parsed.headerLines.length, 6);
  assert.equal(parsed.headerLines[0], 'apiVersion: v1');
  assert.equal(parsed.headerLines[5], '    app: test');

  assert.equal(parsed.dataLines.length, 4);
  assert.equal(parsed.dataLines[0], '  index.html: |');

  assert.equal(parsed.binaryDataLines.length, 2);
  assert.equal(parsed.binaryDataLines[0], '  resume.pdf: |');
});

test('generateConfigMapYaml reconstructs ConfigMap and replaces data section while preserving binaryData and header', () => {
  const parsed = {
    headerLines: [
      'apiVersion: v1',
      'kind: ConfigMap',
      'metadata:',
      '  name: test-config'
    ],
    binaryDataLines: [
      '  resume.pdf: |',
      '    JVBERi0xLjcK'
    ]
  };

  const newFiles = {
    'index.html': '<html>new</html>\n',
    'app.js': 'console.log("new");',
    'app.css': '.new { color: red; }'
  };

  const result = generateConfigMapYaml(parsed, newFiles);

  const expectedYaml = `apiVersion: v1
kind: ConfigMap
metadata:
  name: test-config
data:
  index.html: |
    <html>new</html>
  app.js: |
    console.log("new");
  app.css: |
    .new { color: red; }
binaryData:
  resume.pdf: |
    JVBERi0xLjcK
`;

  assert.equal(result, expectedYaml);
});

test('runSyncOrCheck throws when required build output files are missing', () => {
  const distDir = '/mock/site/dist';
  const configMapPath = '/mock/manifests/nginx/configmap.yaml';

  // Only index.html exists, app.js and app.css are missing
  const files = {
    [path.join(distDir, 'index.html')]: '<html></html>',
    [configMapPath]: 'apiVersion: v1\nkind: ConfigMap\n'
  };
  const mockFs = createMockFs(files);

  assert.throws(() => {
    runSyncOrCheck({
      configMapPath,
      distDir,
      checkMode: false,
      fsInject: mockFs
    });
  }, /Missing build output files/);
});

test('runSyncOrCheck throws in checkMode when ConfigMap is stale', () => {
  const distDir = '/mock/site/dist';
  const configMapPath = '/mock/manifests/nginx/configmap.yaml';

  const files = {
    [path.join(distDir, 'index.html')]: '<html></html>\n',
    [path.join(distDir, 'assets', 'app.js')]: 'console.log("new");',
    [path.join(distDir, 'assets', 'app.css')]: 'body {}',
    [configMapPath]: `apiVersion: v1
kind: ConfigMap
data:
  index.html: |
    <html>old</html>
  app.js: |
    console.log("old");
  app.css: |
    old-body {}
`
  };
  const mockFs = createMockFs(files);

  assert.throws(() => {
    runSyncOrCheck({
      configMapPath,
      distDir,
      checkMode: true,
      fsInject: mockFs
    });
  }, /ConfigMap is stale. Run generator to sync./);
});

test('runSyncOrCheck completes successfully in checkMode when ConfigMap matches build outputs', () => {
  const distDir = '/mock/site/dist';
  const configMapPath = '/mock/manifests/nginx/configmap.yaml';

  const files = {
    [path.join(distDir, 'index.html')]: '<html></html>\n',
    [path.join(distDir, 'assets', 'app.js')]: 'console.log("new");',
    [path.join(distDir, 'assets', 'app.css')]: 'body {}',
    [configMapPath]: `apiVersion: v1
kind: ConfigMap
data:
  index.html: |
    <html></html>
  app.js: |
    console.log("new");
  app.css: |
    body {}
`
  };
  const mockFs = createMockFs(files);

  const result = runSyncOrCheck({
    configMapPath,
    distDir,
    checkMode: true,
    fsInject: mockFs
  });

  assert.equal(result.status, 'up-to-date');
});

test('runSyncOrCheck writes ConfigMap when not in checkMode', () => {
  const distDir = '/mock/site/dist';
  const configMapPath = '/mock/manifests/nginx/configmap.yaml';

  const files = {
    [path.join(distDir, 'index.html')]: '<html></html>\n',
    [path.join(distDir, 'assets', 'app.js')]: 'console.log("new");',
    [path.join(distDir, 'assets', 'app.css')]: 'body {}',
    [configMapPath]: `apiVersion: v1
kind: ConfigMap
data:
  index.html: |
    <html>old</html>
  app.js: |
    console.log("old");
  app.css: |
    old-body {}
binaryData:
  resume.pdf: |
    JVBERi0xLjcK`
  };
  const mockFs = createMockFs(files);

  const result = runSyncOrCheck({
    configMapPath,
    distDir,
    checkMode: false,
    fsInject: mockFs
  });

  assert.equal(result.status, 'written');

  // Verify the files map updated the ConfigMap file
  const updatedYaml = files[configMapPath];
  assert.match(updatedYaml, /<html><\/html>/);
  assert.match(updatedYaml, /console\.log\("new"\);/);
  assert.match(updatedYaml, /body \{\}/);
  assert.match(updatedYaml, /binaryData:/);
  assert.match(updatedYaml, /JVBERi0xLjcK/);
});
