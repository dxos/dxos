//
// Copyright 2023 DXOS.org
//

import type { IconProps } from '@phosphor-icons/react';
import { type DeepSignal } from 'deepsignal';
import type { FC } from 'react';

import type { GraphProvides } from '@braneframe/plugin-graph';
import { type Intent, type IntentProvides } from '@braneframe/plugin-intent';
import type { TranslationsProvides } from '@braneframe/plugin-theme';

export const STACK_PLUGIN = 'dxos.org/plugin/stack';

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

// TODO(wittjosiah): Use intents for creation.
export type StackSectionCreator = StackSectionAction & {
  intent: Intent;
};

// TODO(wittjosiah): Make filter serializable.
export type StackSectionChooser = StackSectionAction & {
  filter: (data: unknown) => boolean;
};

export type StackProvides = {
  stack: {
    creators?: StackSectionCreator[];
    choosers?: StackSectionChooser[]; // TODO(burdon): Selectors?
  };
};

export type StackState = DeepSignal<{
  creators: StackSectionCreator[];
  choosers: StackSectionChooser[];
}>;

export type StackPluginProvides = GraphProvides & IntentProvides & TranslationsProvides & { stack: StackState };

// TODO(burdon): Rename StackSectionObject?
export type StackObject = { id: string };

export type GenericStackObject = StackObject & { [key: string]: any };

export type StackSectionModel<T extends StackObject = GenericStackObject> = {
  id: string;
  index: string;
  object: T;
};

export type StackSections<T extends StackObject = GenericStackObject> = StackSectionModel<T>[];

export type StackModel<T extends StackObject = GenericStackObject> = {
  id: string;
  sections: StackSections<T>;
};

// TODO(burdon): Why is this separate from StackModel?
export type StackProperties = {
  title?: string;
};

export const getSectionModel = (object: GenericStackObject, index: string): StackSectionModel => ({
  id: object.id,
  index,
  object,
});
