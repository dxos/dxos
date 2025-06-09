//
// Copyright 2025 DXOS.org
//

import { pipeline, TokenClassificationPipelineType } from '@xenova/transformers';

let _ner: Promise<TokenClassificationPipelineType>;
/**
 * Named Entity Recognition pipeline.
 * Initializes the pipeline on first call.
 * @returns The singleton promise that resolves to a token classification pipeline.
 */
export const getNer = () => {
  if (!_ner) {
    _ner = pipeline('ner', 'Xenova/bert-base-NER');
  }
  return _ner;
};
