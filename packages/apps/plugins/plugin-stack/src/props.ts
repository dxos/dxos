//
// Copyright 2023 DXOS.org
//

import type { IconProps } from '@phosphor-icons/react';
import type { FC } from 'react';

import type { SpaceProvides } from '@braneframe/plugin-space';
import type { TranslationsProvides } from '@braneframe/plugin-theme';
import { subscribe, ObservableArray } from '@dxos/observable-object';

type StackSectionAction = {
  id: string;
  testId: string;
  label: string | [string, { ns: string }];
  icon: FC<IconProps>;
};

export type StackSectionCreator<T extends StackSectionModel['object'] = GenericStackObject> = StackSectionAction & {
  create: () => T;
};

export type StackSectionChooser = StackSectionAction & {
  filter: (datum: unknown) => boolean;
};

export type StackProvides = {
  stack: {
    creators?: StackSectionCreator[];
    choosers?: StackSectionChooser[];
  };
};

export type StackPluginProvides = SpaceProvides &
  TranslationsProvides & { stackSectionCreators: StackSectionCreator[]; stackSectionChoosers: StackSectionChooser[] };

export type StackObject = { id: string };

export type GenericStackObject = StackObject & { [key: string]: any };

export type StackSectionModel<T extends StackObject = GenericStackObject> = {
  id: string;
  object: T;
  isPreview?: boolean;
};

export type StackSections<T extends StackObject = GenericStackObject> = ObservableArray<StackSectionModel<T>>;

export type StackModel<T extends StackObject = GenericStackObject> = {
  id: string;
  sections: StackSections<T>;
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

// TODO(burdon): Unused?
export const isStackProperties = (datum: unknown): datum is StackProperties =>
  datum && typeof datum === 'object' ? subscribe in datum : false;
