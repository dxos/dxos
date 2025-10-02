//
// Copyright 2025 DXOS.org
//

import { type TokenClassificationOutput, type TokenClassificationPipelineType } from '@xenova/transformers';
import { beforeAll, describe, expect, test } from 'vitest';

import { log } from '@dxos/log';
import { createTestData } from '@dxos/schema/testing';

import { combineNerTokens, createTokenGroups, extractFullEntities, getNer } from './named-entity-recognition';

// TODO(mykola): This should not run on CI.
describe.skip('NamedEntityRecognition', () => {
  let ner: TokenClassificationPipelineType;

  beforeAll(async () => {
    // Initialize the NER pipeline
    ner = await getNer();
  }, 30_000);

  test('should identify named entities in text', async () => {
    const text = 'Elon Musk is the CEO of SpaceX and Tesla.';
    const result = (await ner(text)) as TokenClassificationOutput;

    // Verify the structure of the result
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);

    log.info('ner', { result });

    const combinedTokens = createTokenGroups(result).map(combineNerTokens);
    log.info('combined', { text, result: combinedTokens });

    // Check for specific entities
    const entities = combinedTokens.map((item) => ({
      text: item.word,
      entity: item.entity,
      score: item.score,
    }));

    log.info('entities', { entities });

    // Verify Elon Musk is recognized as a person
    const elonMusk = entities.find((e) => e.text.includes('Elon') || e.text.includes('Musk'));
    expect(elonMusk).toBeDefined();
    expect(elonMusk?.entity).toMatch(/PER/);

    // Verify SpaceX and Tesla are recognized as organizations
    const companies = entities.filter((e: any) => e.text === 'SpaceX' || e.text === 'Tesla');
    expect(companies.length).toBe(2);
    companies.forEach((company: any) => {
      expect(company.entity).toMatch(/ORG/);
    });
  });

  test('own data', async () => {
    const { transcriptWoflram, transcriptJosiah } = await createTestData();

    const blocks = [...transcriptWoflram, ...transcriptJosiah].flatMap((message) =>
      message.blocks.flatMap((block) => (block._tag === 'transcript' ? [block.text] : [])),
    );

    for (const block of blocks) {
      const entities = await extractFullEntities(block);
      log.info('ner', { text: block, result: entities });
    }
  });

  test('more own data', async () => {
    const { transcriptMessages } = await createTestData();

    const blocks = transcriptMessages.flatMap((message) =>
      message.blocks.flatMap((block) => (block._tag === 'transcript' ? [block.text] : [])),
    );

    for (const block of blocks) {
      const entities = await extractFullEntities(block);
      log.info('ner', { text: block, result: entities });
    }
  });

  test('should handle empty text', async () => {
    const result = await ner('');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  test('should handle text with no named entities', async () => {
    const text = 'The weather is nice today.';
    const result = await ner(text);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });
});
