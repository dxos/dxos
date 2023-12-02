//
// Copyright 2023 DXOS.org
//

import type { IconProps } from '@phosphor-icons/react';
import type { DeepSignal } from 'deepsignal';
import type { FC } from 'react';

import type { Stack as StackType } from '@braneframe/types';
import type {
  GraphBuilderProvides,
  Intent,
  IntentResolverProvides,
  MetadataRecordsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';

import { STACK_PLUGIN } from './meta';

const STACK_ACTION = `${STACK_PLUGIN}/action`;
export enum StackAction {
  CREATE = `${STACK_ACTION}/create`,
}

// TODO(wittjosiah): Creators/choosers likely aren't stack-specific.
//   Also distinct from graph actions though, output should be inserted into current view rather than navigated to.
type StackSectionAction = {
  id: string;
  testId: string;
  label: string | [string, { ns: string }];
  icon: FC<IconProps>;
};

export type StackSectionCreator = StackSectionAction & {
  intent: Intent;
};

export type StackProvides = {
  stack: {
    creators?: StackSectionCreator[];
  };
};

export type StackState = DeepSignal<{
  creators: StackSectionCreator[];
}>;

export type StackPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  MetadataRecordsProvides &
  TranslationsProvides & { stack: StackState };

// TODO(wittjosiah): Assume typed object and just check for typename?
export const isStack = (data: unknown): data is StackType =>
  data && typeof data === 'object'
    ? 'id' in data &&
      typeof data.id === 'string' &&
      typeof (data as { [key: string]: any }).sections === 'object' &&
      typeof (data as { [key: string]: any }).sections?.length === 'number'
    : false;
