//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import { setupGraphBuilder } from '@dxos/app-graph/testing';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import { Key } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import * as GraphNode from '@dxos/graph/GraphNode';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';
import * as SpaceSchema from '@dxos/plugin-space/SpaceSchema';

import { getRoutinesSettingsPath } from '../paths.ts';
import { createRoutinesSettingsExtension } from './app-graph-builder.ts';

describe('routines settings extension', () => {
  test('getRoutinesSettingsPath names the panel the extension builds', async ({ expect }) => {
    const spaceId = Key.SpaceId.random();
    // Stand-in for plugin-space: root -> space -> settings section.
    const stubExtensions = await EffectEx.runPromise(
      Effect.all([
        AppGraphBuilder.createExtension({
          id: 'testSpace',
          match: GraphNodeMatcher.whenRoot,
          connector: () => Effect.succeed([{ id: spaceId, type: 'test.space', data: null, properties: {} }]),
        }),
        AppGraphBuilder.createExtension({
          id: 'testSettings',
          match: GraphNodeMatcher.whenId(GraphPath.getSpacePath(spaceId)),
          connector: () =>
            Effect.succeed([
              {
                id: SpaceSchema.SETTINGS_SECTION_ID,
                type: SpaceSchema.SETTINGS_SECTION_TYPE,
                data: null,
                properties: {},
              },
            ]),
        }),
      ]),
    );
    const extensions = await EffectEx.runPromise(createRoutinesSettingsExtension());
    const { expand, getNode } = setupGraphBuilder({ extensions: [...stubExtensions.flat(), ...extensions] });
    await expand(GraphNode.RootId);
    await expand(GraphPath.getSpacePath(spaceId));
    await expand(GraphPath.getSpacePath(spaceId, SpaceSchema.SETTINGS_SECTION_ID));

    expect(getNode(getRoutinesSettingsPath(spaceId))).not.toBeNull();
  });
});
