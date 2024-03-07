//
// Copyright 2024 DXOS.org
//

import { type IconProps } from '@phosphor-icons/react';
import { type FC } from 'react';

import { type InvokeParams, type Action } from '@dxos/app-graph';
import { type Label } from '@dxos/react-ui';
import { type MaybePromise } from '@dxos/util';

// TODO(thure): Dedupe (also in react-ui-navtree)
export type KeyBinding = {
  windows?: string;
  macos?: string;
  ios?: string;
  linux?: string;
  unknown?: string;
};

// TODO(thure): Dedupe (similar in react-ui-navtree)
export type PlankHeadingAction = Pick<Action, 'id' | 'properties'> & {
  label: Label;
  icon?: FC<IconProps>;
  keyBinding?: string | KeyBinding;
  invoke: (params?: Omit<InvokeParams, 'node'>) => MaybePromise<any>;
};
