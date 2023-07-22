// TODO(burdon): Factor out to spaces.
//
// Copyright 2023 DXOS.org
//

import { DocumentModel } from '@dxos/document-model';
import { ModelFactory } from '@dxos/model-factory';
import { TextModel } from '@dxos/text-model';

export const createDefaultModelFactory = () => {
  return new ModelFactory().registerModel(DocumentModel).registerModel(TextModel);
};
