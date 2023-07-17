//
// Copyright 2023 DXOS.org
//

import { SpaceProvides } from '@braneframe/plugin-space';
import { TranslationsProvides } from '@braneframe/plugin-theme';
import { Testing as TestingType } from '@braneframe/types';
import { isTypedObject } from '@dxos/client';

export type TestingPluginProvides = SpaceProvides & TranslationsProvides;

export interface TestingModel {
  object: TestingType;
}

export const isTesting = (datum: unknown): datum is TestingType => {
  return isTypedObject(datum) && TestingType.type.name === datum.__typename;
};
