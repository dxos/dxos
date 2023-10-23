// TODO(burdon): Factor out to spaces.
//
// Copyright 2023 DXOS.org
//

import { DocumentModel } from '@dxos/document-model';
import { EchoObject, base } from '@dxos/echo-schema';
import { ModelFactory } from '@dxos/model-factory';
import { TextModel } from '@dxos/text-model';
import { SpaceProxy } from './space-proxy';

export const createDefaultModelFactory = () => {
  return new ModelFactory().registerModel(DocumentModel).registerModel(TextModel);
};

export const getSpaceForObject = (object: EchoObject): SpaceProxy | undefined => {
  const key = object[base]._database?._backend.spaceKey
  if (!key) {
    return undefined
  }
  const owner = object[base]._database?.graph._getOwningObject(key)
  if (owner instanceof SpaceProxy) {
    return owner
  } else {
    return undefined
  }
}