//
// Copyright 2023 DXOS.org
//

import type { IconProps } from '@phosphor-icons/react';
import type { FC } from 'react';

import type { GraphProvides } from '@braneframe/plugin-graph';
import type { TranslationsProvides } from '@braneframe/plugin-theme';
import { ObservableArray } from '@dxos/observable-object';

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

export type StackPluginProvides = GraphProvides &
  TranslationsProvides & { stackSectionCreators: StackSectionCreator[]; stackSectionChoosers: StackSectionChooser[] };

export type StackObject = { id: string };

export type GenericStackObject = StackObject & { [key: string]: any };

export type StackSectionModel<T extends StackObject = GenericStackObject> = {
  object: T;
};

export type StackSections<T extends StackObject = GenericStackObject> = ObservableArray<StackSectionModel<T>>;

export type StackModel<T extends StackObject = GenericStackObject> = {
  id: string;
  sections: StackSections<T>;
};

export type StackProperties = {
  title?: string;
};
