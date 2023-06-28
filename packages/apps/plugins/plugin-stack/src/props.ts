//
// Copyright 2023 DXOS.org
//

import type { IconProps } from '@phosphor-icons/react';
import type { FC } from 'react';

import type { SpaceProvides } from '@braneframe/plugin-space';
import type { TranslationsProvides } from '@braneframe/plugin-theme';
import { subscribe, ObservableArray } from '@dxos/observable-object';

export type StackSectionCreator<T extends StackSectionModel['object'] = GenericStackObject> = {
  id: string;
  testId: string;
  label: string | [string, { ns: string }];
  icon: FC<IconProps>;
  create: () => T;
};

export type StackProvides = {
  stack: {
    types?: StackSectionCreator[];
  };
};

export type StackPluginProvides = SpaceProvides &
  TranslationsProvides & { stackSectionCreators: StackSectionCreator[] };

export type StackSections = ObservableArray<StackSectionModel<any>>;

export type StackObject = { id: string };

export type GenericStackObject = StackObject & { [key: string]: any };

export type StackSectionModel<T extends StackObject = GenericStackObject> = {
  object: T;
};

export type StackModel<T extends StackObject = GenericStackObject> = {
  id: string;
  sections: ObservableArray<StackSectionModel<T>>;
};

export type StackProperties = {
  title?: string;
};

export const isStack = <T extends StackObject = GenericStackObject>(datum: unknown): datum is StackModel<T> =>
  datum && typeof datum === 'object'
    ? 'id' in datum &&
      typeof datum.id === 'string' &&
      typeof (datum as { [key: string]: any }).sections === 'object' &&
      typeof (datum as { [key: string]: any }).sections?.length === 'number'
    : false;

export const isStackProperties = (datum: unknown): datum is StackProperties =>
  datum && typeof datum === 'object' ? subscribe in datum : false;
