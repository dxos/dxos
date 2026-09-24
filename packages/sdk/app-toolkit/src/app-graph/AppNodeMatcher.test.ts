//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import { describe, test } from 'vitest';

import * as GraphNode from '@dxos/graph/GraphNode';

import * as GraphPath from '../app/GraphPath.ts';
import * as AppNodeMatcher from './AppNodeMatcher.ts';

describe('AppNodeMatcher.whenDebugGroup', () => {
  test('matches the debug category node and nothing else', ({ expect }) => {
    const debug = { id: `${GraphNode.RootId}/debug`, type: GraphPath.GroupTypes.debug, data: null, properties: {} };
    const system = {
      id: `${GraphNode.RootId}/x/system`,
      type: GraphPath.GroupTypes.system,
      data: null,
      properties: {},
    };
    expect(Option.isSome(AppNodeMatcher.whenDebugGroup(debug))).toBe(true);
    expect(Option.isNone(AppNodeMatcher.whenDebugGroup(system))).toBe(true);
  });
});
