//
// Copyright 2023 DXOS.org
//

import { type IconProps } from '@phosphor-icons/react';
import { type FC } from 'react';

import type {
  Intent,
  MetadataRecordsProvides,
  SettingsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import { type SchemaProvides } from '@dxos/plugin-client';
import { type CollectionType } from '@dxos/plugin-space/types';
import { type Label } from '@dxos/react-ui';
import { type StackItemSize } from '@dxos/react-ui-stack';

export type AddSectionPosition = 'before' | 'after' | 'beforeAll' | 'afterAll';

export type CollapsedSections = Record<string, boolean>;

export type CollectionItem = CollectionType['objects'][number];

export type StackSectionView = {
  title?: string;
  size?: StackItemSize;
  height?: number;
  collapsed?: boolean;
  custom?: Record<string, any>;
};

// TODO(wittjosiah): Creators/choosers likely aren't stack-specific.
//  Also distinct from graph actions though, output should be inserted into current view rather than navigated to.
type StackSectionAction = {
  id: string;
  testId: string;
  type: string | [string, { ns: string }];
  label: string | [string, { ns: string }];
  icon: FC<IconProps>;
};

export type StackSectionMetadata = {
  icon?: string;
  placeholder?: Label;
  viewActions?: (item: CollectionItem) => StackSectionAction;
};

export type StackSectionItem = {
  id: string;
  object: CollectionType['objects'][number];
  view: StackSectionView;
  metadata: StackSectionMetadata;
};

export type StackSectionCreator = StackSectionAction & {
  intent: Intent | Intent[];
};

export type StackProvides = {
  stack: {
    creators?: StackSectionCreator[];
  };
};

export type StackState = {
  creators: StackSectionCreator[];
};

export type StackSettingsProps = { separation: boolean };

export type StackPluginProvides = SurfaceProvides &
  MetadataRecordsProvides &
  SettingsProvides<StackSettingsProps> &
  TranslationsProvides &
  SchemaProvides & { stack: StackState };
