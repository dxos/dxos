//
// Copyright 2026 DXOS.org
//

// @vitest-environment happy-dom

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import { DXN } from '@dxos/echo';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';
import * as Harness from '@dxos/plugin-testing/Harness';

import * as DeckPlugin from '#meta';
import { DeckCapabilities } from '#types';

await Harness.preload({ plugins: [DeckPlugin.make()] });

const WORKSPACE_TYPE = 'example.com.type.workspace';
const DOC_TYPE = 'example.com.type.doc';
const WORKSPACE = 'root/ws';
const PLANKS = [`${WORKSPACE}/docA`, `${WORKSPACE}/docB`];

describe('LayoutOperation.Set', () => {
  test('focuses the plank attention falls to by default', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({ plugins: [DocsPlugin(), DeckPlugin.make()] });
    expect(await setDeck(harness)).toEqual({ active: PLANKS, scrollIntoView: { id: PLANKS[0] } });
  });

  test('focuses no plank with `focus: false`', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({ plugins: [DocsPlugin(), DeckPlugin.make()] });
    expect(await setDeck(harness, false)).toEqual({ active: PLANKS, scrollIntoView: undefined });
  });

  test('a sliding deck reports a front only while it was measured against the planks it shows', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({ plugins: [DocsPlugin(), DeckPlugin.make()] });
    const registry = harness.get(Capabilities.AtomRegistry);
    const front = () => registry.get(harness.get(AppCapabilities.Layout)).front;
    registry.update(harness.get(DeckCapabilities.Settings), (settings) => ({ ...settings, flatten: false }));
    await setDeck(harness);
    const ephemeralAtom = harness.get(DeckCapabilities.EphemeralState);
    const measure = (id: string | undefined, planks: readonly string[]) =>
      registry.update(ephemeralAtom, (ephemeral) => ({ ...ephemeral, front: { id, planks: planks.join('\n') } }));

    measure(PLANKS[1], PLANKS);
    expect(front()).toBe(PLANKS[1]);

    // A plank before the front closes: the front plank is still open, but the deck has not measured where it now is.
    await harness.runPromise(Operation.invoke(LayoutOperation.Set, { subject: [PLANKS[1]] }));
    expect(front()).toBeUndefined();

    // A deck that is not sliding measures no front and shows its planks from the first.
    measure(undefined, [PLANKS[1]]);
    expect(front()).toBe(PLANKS[1]);
  });
});

type TestApp = Awaited<ReturnType<typeof Harness.createComposerTestApp>>;

/** Sets the deck to {@link PLANKS} in {@link WORKSPACE}, answering the plank the write asks to focus. */
const setDeck = async (harness: TestApp, focus?: false) => {
  await harness.runPromise(Operation.invoke(LayoutOperation.SwitchWorkspace, { subject: WORKSPACE }));
  const registry = harness.get(Capabilities.AtomRegistry);
  const ephemeralAtom = harness.get(DeckCapabilities.EphemeralState);
  registry.update(ephemeralAtom, (ephemeral) => ({ ...ephemeral, scrollIntoView: undefined }));
  await harness.runPromise(
    Operation.invoke(LayoutOperation.Set, { subject: PLANKS, ...(focus === false && { focus }) }),
  );
  const ephemeral = registry.get(ephemeralAtom);
  return { active: ephemeral.open[WORKSPACE]?.active, scrollIntoView: ephemeral.scrollIntoView };
};

/** A workspace of two documents, each addressable by URL. */
const DocsPlugin = Plugin.define(Plugin.makeMeta({ key: DXN.make('example.com.plugin.docs'), name: 'Docs' })).pipe(
  Plugin.addModule<void>(
    Capability.inlineModule('docs', { provides: [AppCapabilities.AppGraphBuilder] }, () =>
      Effect.gen(function* () {
        const workspaces = yield* AppGraphBuilder.createExtension({
          id: 'workspaces',
          match: GraphNodeMatcher.whenRoot,
          connector: () => Effect.succeed([{ id: 'ws', type: WORKSPACE_TYPE, data: null }]),
        });
        const docs = yield* AppGraphBuilder.createExtension({
          id: 'docs',
          url: { key: 'doc', kind: 'item', path: [] },
          match: GraphNodeMatcher.whenNodeType(WORKSPACE_TYPE),
          connector: () =>
            Effect.succeed([
              { id: 'docA', type: DOC_TYPE, data: null },
              { id: 'docB', type: DOC_TYPE, data: null },
            ]),
        });
        return Capability.contribute(AppCapabilities.AppGraphBuilder, [...workspaces, ...docs]);
      }),
    ),
  ),
  Plugin.make,
);
