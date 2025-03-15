//
// Copyright 2023 DXOS.org
//

import { type IconProps } from '@phosphor-icons/react';
import { type FC } from 'react';

import { type CollectionType } from '@dxos/plugin-space/types';
import { type ReactiveEchoObject } from '@dxos/react-client/echo';
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
  object: ReactiveEchoObject<any>;
  view: StackSectionView;
  metadata: StackSectionMetadata;
};

export type StackSettingsProps = { separation: boolean };
