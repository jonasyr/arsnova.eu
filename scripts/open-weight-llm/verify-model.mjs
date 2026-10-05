#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { createReadStream, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const manifestPath = resolve(
  process.argv[2] ?? `${repositoryRoot}/docker/open-weight-llm/model-manifest.json`,
);
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const modelPath = resolve(
  process.argv[3] ?? `${repositoryRoot}/models/open-weight-llm/${manifest.filename}`,
);

const stat = statSync(modelPath);
if (stat.size !== manifest.sizeBytes) {
  throw new Error(`GGUF size mismatch: expected ${manifest.sizeBytes}, received ${stat.size}`);
}

const hash = createHash('sha256');
for await (const chunk of createReadStream(modelPath)) {
  hash.update(chunk);
}
const digest = hash.digest('hex');
if (digest !== manifest.sha256) {
  throw new Error(`GGUF digest mismatch: expected ${manifest.sha256}, received ${digest}`);
}

process.stdout.write(
  `${manifest.filename}: verified ${manifest.sizeBytes} bytes, sha256:${manifest.sha256}\n`,
);
