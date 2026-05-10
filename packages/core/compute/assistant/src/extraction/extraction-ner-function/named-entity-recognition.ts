//
// Copyright 2025 DXOS.org
//

import {
  type TokenClassificationOutput,
  type TokenClassificationPipelineType,
  type TokenClassificationSingle,
  pipeline,
} from '@xenova/transformers';

import { log } from '@dxos/log';

let _ner: Promise<TokenClassificationPipelineType>;

/**
 * Named Entity Recognition pipeline.
 * Initializes the pipeline on first call.
 * @returns The singleton promise that resolves to a token classification pipeline.
 */
export const getNer = () => {
  if (!_ner) {
    _ner = pipeline('ner', 'Xenova/bert-base-NER').then((ner) => {
      log.info('NER model is ready');
      return ner;
    });
  }

  return _ner;
};

/**
 * Extracts entities from text using the named entity recognition pipeline and does simple grouping of tokens.
 */
export const extractFullEntities = async (text: string): Promise<TokenClassificationSingle[]> => {
  const ner = await getNer();
  const entities = (await ner(text)) as TokenClassificationOutput;
  const tokenGroups = createTokenGroups(entities);
  const combinedEntities = tokenGroups.map(combineNerTokens);
  return combinedEntities;
};

export const createTokenGroups = (tokens: TokenClassificationSingle[]): TokenClassificationSingle[][] => {
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

export const combineNerTokens = (group: TokenClassificationSingle[]): TokenClassificationSingle => {
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
