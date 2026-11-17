//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Atom from 'effect/reactivity/Atom';
import * as Registry from 'effect/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';

import * as AppCapabilities from './AppCapabilities.ts';
import * as ReadOnly from './ReadOnly.ts';

const NODE: AppGraphNode.Node = { id: 'node', type: 'test', properties: {}, data: null };

describe('ReadOnly', () => {
  test('a matcher matches until the host contributes ReadOnly, then matches nothing', ({ expect }) => {
    const registry = Registry.make();
    const manager = CapabilityManager.make({ registry });
    const readOnly = Effect.runSync(ReadOnly.atom.pipe(Effect.provideService(Capability.Service, manager)));
    const match = ReadOnly.unless(readOnly, (node) => Option.some(node.id));
    const matched = Atom.make((get) => match(NODE, get));

    expect(registry.get(matched)).toEqual(Option.some('node'));
    expect(ReadOnly.isActive(manager)).toBe(false);

    manager.contribute({ module: 'test', interface: AppCapabilities.ReadOnly, implementation: true });

    expect(registry.get(matched)).toEqual(Option.none());
    expect(ReadOnly.isActive(manager)).toBe(true);
  });
});
