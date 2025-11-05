//
// Copyright 2023 DXOS.org
//

import { type FC } from 'react';

import { type Obj } from '@dxos/echo';
import { type Label } from '@dxos/react-ui';
import { type StackItemSize } from '@dxos/react-ui-stack';
import { type DataType } from '@dxos/schema';

export type AddSectionPosition = 'before' | 'after' | 'beforeAll' | 'afterAll';

export type CollapsedSections = Record<string, boolean>;

export type CollectionItem = DataType.Collection.Collection['objects'][number];

export type StackSectionView = {
  title?: string;
  size?: StackItemSize;
  height?: number;
  collapsed?: boolean;
  custom?: Record<string, any>;
};

type StackSectionAction = {
  id: string;
  testId: string;
  type: string | [string, { ns: string }];
  label: string | [string, { ns: string }];
  icon: FC<{ className?: string; size?: number }>;
};

export type StackSectionMetadata = {
  icon?: string;
  placeholder?: Label;
  viewActions?: (item: CollectionItem) => StackSectionAction;
};

export type StackSectionItem = {
  id: string;
  object: Obj.Any;
  view: StackSectionView;
  metadata: StackSectionMetadata;
};

export type StackSettingsProps = { separation: boolean };
