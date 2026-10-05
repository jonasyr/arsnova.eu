import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
const runtimeRoot = join(repoRoot, 'docker/open-weight-llm');

test('Runtime-Image und GGUF sind unveränderlich gepinnt, das Modell bleibt außerhalb des Layers', () => {
  const dockerfile = readFileSync(join(runtimeRoot, 'Dockerfile'), 'utf8');
  assert.match(
    dockerfile,
    /FROM ghcr\.io\/ggml-org\/llama\.cpp:server-b10524@sha256:57e505f69c3a55fa5dd9c15fced47cff7a899f5b5b504ea93d75b2f401b87830/,
  );
  assert.doesNotMatch(dockerfile, /COPY[^\n]*\.gguf/i);

  const manifest = JSON.parse(readFileSync(join(runtimeRoot, 'model-manifest.json'), 'utf8'));
  assert.equal(manifest.sourceRevision, 'a06e946bb6b655725eafa393f4a9745d460374c9');
  assert.equal(manifest.sizeBytes, 2_497_281_120);
  assert.equal(manifest.sha256, '3605803b982cb64aead44f6c1b2ae36e3acdb41d8e46c8a94c6533bc4c67e597');
  assert.match(manifest.downloadUrl, /\/resolve\/a06e946bb6b655725eafa393f4a9745d460374c9\//);
  assert.doesNotMatch(manifest.downloadUrl, /\/resolve\/(?:main|latest)\//);
});

test('Entry-Point erzwingt Auth, CPU-only, einen Slot und die vereinbarten Hartflags', () => {
  const entrypoint = readFileSync(join(runtimeRoot, 'entrypoint.sh'), 'utf8');
  for (const flag of [
    '--parallel 1',
    '--ctx-size 4096',
    '--n-predict 768',
    '--no-webui',
    '--slots',
    '--api-key',
    '--reasoning off',
    '--n-gpu-layers 0',
    '--slot-prompt-similarity 0',
    '--jinja',
    '--offline',
  ]) {
    assert.ok(entrypoint.includes(flag), `missing hard flag: ${flag}`);
  }
  assert.match(
    entrypoint,
    /model_sha256=3605803b982cb64aead44f6c1b2ae36e3acdb41d8e46c8a94c6533bc4c67e597/,
  );
  assert.match(entrypoint, /OPEN_WEIGHT_LLM_TOKEN/);
  assert.match(entrypoint, /OPEN_WEIGHT_LLM_THREADS must be an integer from 1 to 4/);
  assert.match(entrypoint, /export LC_ALL=C/);
  assert.match(entrypoint, /\[:graph:\]/);
  assert.doesNotMatch(entrypoint, /--(?:model-url|hf-repo|hf-file)\b/);
  assert.match(entrypoint, /10\.\* \| 192\.168\.\*/);
  assert.match(entrypoint, /172\.1\[6-9\]\.\*/);
  assert.match(entrypoint, /\[fF\]\[cCdD\]\*:\*/);
  assert.match(entrypoint, /explicit private address/);
  for (const script of ['entrypoint.sh', 'healthcheck.sh']) {
    const syntax = spawnSync('sh', ['-n', join(runtimeRoot, script)], { encoding: 'utf8' });
    assert.equal(syntax.status, 0, syntax.stderr);
  }
});

test('Model-Prüfer verifiziert Größe und SHA-256 ohne Netz- oder Downloadpfad', () => {
  const fixtureDir = mkdtempSync(join(tmpdir(), 'arsnova-llm-model-'));
  try {
    const modelPath = join(fixtureDir, 'fixture.gguf');
    const manifestPath = join(fixtureDir, 'manifest.json');
    const bytes = Buffer.from('small deterministic model fixture');
    const digest = createHash('sha256').update(bytes).digest('hex');
    writeFileSync(modelPath, bytes);
    writeFileSync(
      manifestPath,
      JSON.stringify({ filename: 'fixture.gguf', sizeBytes: bytes.length, sha256: digest }),
    );
    const verified = spawnSync(
      process.execPath,
      [join(repoRoot, 'scripts/open-weight-llm/verify-model.mjs'), manifestPath, modelPath],
      { encoding: 'utf8' },
    );
    assert.equal(verified.status, 0, verified.stderr);
    assert.match(verified.stdout, new RegExp(digest));

    writeFileSync(modelPath, Buffer.from('tampered'));
    const rejected = spawnSync(
      process.execPath,
      [join(repoRoot, 'scripts/open-weight-llm/verify-model.mjs'), manifestPath, modelPath],
      { encoding: 'utf8' },
    );
    assert.notEqual(rejected.status, 0);
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
});
