//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Registry from 'effect/reactivity/AtomRegistry';
import { describe, test, vi } from 'vitest';

import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import * as PathResolution from '@dxos/app-graph/PathResolution';
import { setupGraphBuilder } from '@dxos/app-graph/testing';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as EffectEx from '@dxos/effect/EffectEx';
import { EntityId, SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import { createCollectionExtensions } from './collections.ts';

describe('collection URL bindings', () => {
  const setup = async () => {
    const manager = CapabilityManager.make({ registry: Registry.make() });
    const extensions = await EffectEx.runPromise(
      createCollectionExtensions({ shareableLinkOrigin: '' }).pipe(Effect.provideService(Capability.Service, manager)),
    );
    return setupGraphBuilder({ extensions });
  };

  test('an object is addressed by its own id at any depth of the collection tree, by one binding', async ({
    expect,
  }) => {
    const { builder } = await setup();
    const warn = vi.spyOn(log, 'warn');
    const spaceId = SpaceId.random();
    const [collectionId, objectId] = [EntityId.random(), EntityId.random()];
    for (const nodeId of [
      GraphPath.getCollectionsPath(spaceId, objectId),
      GraphPath.getCollectionsPath(spaceId, collectionId, objectId),
    ]) {
      expect(Option.getOrUndefined(PathResolution.representNode(builder, nodeId))).toEqual({
        key: 'object',
        id: objectId,
        workspace: spaceId,
      });
    }
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
