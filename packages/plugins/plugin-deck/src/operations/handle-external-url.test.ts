//
// Copyright 2026 DXOS.org
//

// @vitest-environment happy-dom

import * as Effect from 'effect/Effect';
import { beforeEach, describe, test } from 'vitest';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as LinkAction from '@dxos/app-toolkit/LinkAction';
import * as Operation from '@dxos/compute/Operation';
import { DXN } from '@dxos/echo';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';
import * as Harness from '@dxos/plugin-testing/Harness';

import * as DeckPlugin from '#meta';
import { DeckOperation } from '#types';

await Harness.preload({ plugins: [DeckPlugin.make()] });

const WORKSPACE_TYPE = 'example.com.type.workspace';
const DOC_TYPE = 'example.com.type.doc';
const WORKSPACE = 'root/ws';
const PRESENT = DXN.make('com.example.linkAction.present');

describe('DeckOperation.HandleExternalUrl', () => {
  beforeEach(() => window.history.replaceState(null, '', '/'));

  test('runs the action a link names on the object it opens, once', async ({ expect }) => {
    const ran: unknown[] = [];
    await using harness = await Harness.createComposerTestApp({
      plugins: [DocsPlugin(ran), DeckPlugin.make()],
    });
    await harness.runPromise(Operation.invoke(DeckOperation.HandleExternalUrl, {}));
    await harness.runPromise(
      Operation.invoke(LayoutOperation.Set, { subject: [`${WORKSPACE}/deck`], workspace: WORKSPACE }),
    );
    const opened = new URL(window.location.href);

    for (const action of [PRESENT, DXN.make('com.example.linkAction.unknown')]) {
      const url = new URL(opened);
      url.searchParams.set(LinkAction.PARAM, action);
      window.history.replaceState(null, '', url);
      await harness.runPromise(Operation.invoke(DeckOperation.HandleExternalUrl, {}));
      expect(new URL(window.location.href).searchParams.has(LinkAction.PARAM)).toBe(false);
    }
    expect(ran).toEqual(['deck']);

    await harness.runPromise(Operation.invoke(DeckOperation.HandleExternalUrl, {}));
    expect(ran).toEqual(['deck']);
  });
});

/** A workspace with one deck, addressable by URL, and a present action that records what it ran on. */
const DocsPlugin = (ran: unknown[]) =>
  Plugin.define(Plugin.makeMeta({ key: DXN.make('example.com.plugin.docs'), name: 'Docs' })).pipe(
    Plugin.addModule<void>(
      Capability.inlineModule(
        'docs',
        { provides: [AppCapabilities.AppGraphBuilder, AppCapabilities.LinkAction] },
        Effect.fnUntraced(function* () {
          const workspaces = yield* AppGraphBuilder.createExtension({
            id: 'workspaces',
            match: GraphNodeMatcher.whenRoot,
            connector: () => Effect.succeed([{ id: 'ws', type: WORKSPACE_TYPE, data: null }]),
          });
          const docs = yield* AppGraphBuilder.createExtension({
            id: 'docs',
            url: { key: 'doc', kind: 'item', path: [] },
            match: GraphNodeMatcher.whenNodeType(WORKSPACE_TYPE),
            connector: () => Effect.succeed([{ id: 'deck', type: DOC_TYPE, data: 'deck' }]),
          });
          return [
            Capability.contribute(AppCapabilities.AppGraphBuilder, [...workspaces, ...docs]),
            Capability.contribute(AppCapabilities.LinkAction, {
              id: PRESENT,
              links: ['public'],
              appliesTo: (data) => data === 'deck',
              run: (data) => Effect.sync(() => ran.push(data)),
            }),
          ];
        }),
      ),
    ),
    Plugin.make,
  )();
