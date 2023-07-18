//
// Copyright 2023 DXOS.org
//

import { Context, createContext } from 'react';

import { TranslationsProvides } from '@braneframe/plugin-theme';
import { Testing as TestingType } from '@braneframe/types';
import { isTypedObject } from '@dxos/client';

export type TestingContextType = {
  running: boolean;
  start: (fn: () => void, period: number) => void;
  stop: () => void;
};

export const TestingContext: Context<TestingContextType> = createContext<TestingContextType>({
  running: false,
  start: () => {},
  stop: () => {},
});

export type TestingPluginProvides = TranslationsProvides;

export interface TestingModel {
  object: TestingType;
}

export const isTesting = (datum: unknown): datum is TestingType => {
  return isTypedObject(datum) && TestingType.type.name === datum.__typename;
};
