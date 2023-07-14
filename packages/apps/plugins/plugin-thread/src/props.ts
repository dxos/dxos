//
// Copyright 2023 DXOS.org
//

import { SpaceProvides } from '@braneframe/plugin-space';
import { TranslationsProvides } from '@braneframe/plugin-theme';
import { Thread as ThreadType } from '@braneframe/types';
import { isTypedObject } from '@dxos/client';

export type ThreadPluginProvides = SpaceProvides & TranslationsProvides;

export interface ThreadModel {
  root: ThreadType;
}

export const isThread = (datum: unknown): datum is ThreadType => {
  return isTypedObject(datum) && ThreadType.type.name === datum.__typename;
};
