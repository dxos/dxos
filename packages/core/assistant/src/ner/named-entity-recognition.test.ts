//
// Copyright 2025 DXOS.org
//

import {
  pipeline,
  TokenClassificationOutput,
  TokenClassificationPipelineType,
  TokenClassificationSingle,
} from '@xenova/transformers';
import { beforeAll, describe, expect, test } from 'vitest';

import { log } from '@dxos/log';
import { createTestData } from '@dxos/schema/testing';

const createTokenGroups = (tokens: TokenClassificationSingle[]): TokenClassificationSingle[][] => {
  const tokenGroups: TokenClassificationSingle[][] = [];

  const canBeCombined = (prevToken: TokenClassificationSingle, currentToken: TokenClassificationSingle) => {
    const [currentState, currentEntity] = currentToken.entity.split('-'); // B, I, O
    const [prevState, prevEntity] = prevToken.entity.split('-'); // B, I, O

    if (prevEntity !== currentEntity) {
      return false;
    }

    if (prevState === 'O') {
      return false;
    }

    if (currentState === 'I') {
      return true;
    }

    if ((prevState === 'B' || prevState === 'I') && currentState === 'B') {
      return currentToken.word.startsWith('#');
    }

    return false;
  };

  for (const token of tokens) {
    if (tokenGroups.length === 0) {
      tokenGroups.push([token]);
      continue;
    }

    const lastTokenGroup = tokenGroups.at(-1)!;
    if (canBeCombined(lastTokenGroup.at(-1)!, token)) {
      lastTokenGroup.push(token);
      continue;
    }

    tokenGroups.push([token]);
  }

  return tokenGroups;
};

const combineNerTokens = (group: TokenClassificationSingle[]): TokenClassificationSingle => {
  const combinedToken: TokenClassificationSingle = {
    entity: group.at(0)!.entity.split('-')[1],
    score: group.reduce((acc, token) => acc + token.score, 0) / group.length,
    index: group.at(0)!.index,
    word: group.at(0)!.word,
    start: group.at(0)!.start,
    end: group.at(-1)!.end,
  };

  for (const token of group.slice(1)) {
    if (token.word.startsWith('#')) {
      combinedToken.word += token.word.replace(/^#+/, '');
    } else {
      combinedToken.word += ' ' + token.word;
    }
  }

  return combinedToken;
};

describe('NamedEntityRecognition', () => {
  let ner: TokenClassificationPipelineType;

  beforeAll(async () => {
    // Initialize the NER pipeline
    ner = await pipeline('ner', 'Xenova/bert-base-NER');
  }, 30_000);

  test.skip('should identify named entities in text', async () => {
    const text = 'Elon Musk is the CEO of SpaceX and Tesla.';
    const result = (await ner(text)) as TokenClassificationOutput;

    // Verify the structure of the result
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);

    log.info('ner', { result });

    // Check for specific entities
    const entities = result.map((item: TokenClassificationSingle) => ({
      text: item.word,
      entity: item.entity,
      score: item.score,
    }));

    // Verify Elon Musk is recognized as a person
    const elonMusk = entities.find((e) => e.text === 'Elon' || e.text === 'Musk');
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
      message.blocks.flatMap((block) => (block.type === 'transcription' ? [block.text] : [])),
    );

    for (const block of blocks) {
      const result = (await ner(block)) as TokenClassificationOutput;
      const combinedTokens = createTokenGroups(result).map(combineNerTokens);
      log.info('ner', { text: block, result: combinedTokens });
    }
  });

  test('more own data', async () => {
    const { transcriptMessages } = await createTestData();

    const blocks = transcriptMessages.flatMap((message) =>
      message.blocks.flatMap((block) => (block.type === 'transcription' ? [block.text] : [])),
    );

    for (const block of blocks) {
      const result = (await ner(block)) as TokenClassificationOutput;
      const combinedTokens = createTokenGroups(result).map(combineNerTokens);
      log.info('ner', { text: block, result: combinedTokens });
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
