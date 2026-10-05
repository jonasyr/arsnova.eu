import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const routersDir = join(process.cwd(), 'src/routers');

describe('wordCloud hotpath isolation', () => {
  it('haelt spaCy, Encoder und LLM aus Vote-, Q&A-Submit- und Join-Routern', () => {
    const forbidden =
      /spacyClient|wordCloudNormalizer|normalizeWordCloudItems|nlpSidecar|wordCloudEncoderClient|wordCloudSemanticAnalyze|embedWithWordCloudEncoder|openWeightLlmClient|runOpenWeightLlm/;
    for (const file of ['vote.ts', 'qa.ts', 'session.ts']) {
      const source = readFileSync(join(routersDir, file), 'utf8');
      expect(source, file).not.toMatch(forbidden);
    }
  });

  it('haelt die LLM-Runtime aus beiden WebSocket-Servern', () => {
    const libDir = join(process.cwd(), 'src/lib');
    for (const file of ['trpcWebSocketServer.ts', 'yjsRelay.ts']) {
      const source = readFileSync(join(libDir, file), 'utf8');
      expect(source, file).not.toMatch(/openWeightLlmClient|runOpenWeightLlm/);
    }
  });

  it('haelt den Q&A-Submit-Router frei von Klassifikator- und Worker-Implementierung', () => {
    const source = readFileSync(join(routersDir, 'qa.ts'), 'utf8');
    expect(source).not.toMatch(
      /qaNlpWorker|runStubQaNlpClassifier|runQaNlpClassifier|qaNlpGatekeeper|qaNlpNaiveBayes|spacyClient/,
    );
    expect(source).toMatch(/enqueueQaNlpJob/);
  });
});
