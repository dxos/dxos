//
// Copyright 2024 DXOS.org
//

import { type ActionLike } from '@dxos/app-graph';

// TODO(thure): Dedupe (also in react-ui-navtree)
export type KeyBinding = {
  windows?: string;
  macos?: string;
  ios?: string;
  linux?: string;
  unknown?: string;
};

// TODO(thure): Dedupe (similar in react-ui-navtree)
export type PlankHeadingAction = Pick<ActionLike, 'id' | 'properties' | 'data'>;
