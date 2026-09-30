//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { Surface } from '@dxos/app-framework/ui';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { DXN } from '@dxos/echo';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';

import { DebugSurface } from '#types';

export const STUB_TOOLS_BRANCH = 'tools';

const STUB_TOOLS_TYPE = 'stub-tools';

/** Node data (and article text) of the stub pages, so a play test can select one and read it back. */
export const STUB_TOOL_PAGES = [
  { id: 'alpha', data: 'stub-tool.alpha', label: 'Alpha tool' },
  { id: 'beta', data: 'stub-tool.beta', label: 'Beta tool' },
] as const;

const stubGraphBuilder = Capability.inlineModule(
  'stub-tools-graph',
  { provides: [AppCapabilities.AppGraphBuilder] },
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      AppGraphBuilder.createExtension({
        id: 'stubTools',
        match: AppNodeMatcher.whenDebugGroup,
        connector: () =>
          Effect.succeed([
            AppGraphNode.make({
              id: STUB_TOOLS_BRANCH,
              type: STUB_TOOLS_TYPE,
              data: null,
              // A branch before its children are loaded, so the row shows its chevron on first paint.
              properties: { label: 'Tools', icon: 'ph--wrench--regular', role: 'branch', position: 2 },
            }),
          ]),
      }),
      // The pages hang off the branch by a connector of their own, as a real tool plugin's do, so
      // they only exist once the branch is expanded — the case a restored selection has to survive.
      AppGraphBuilder.createExtension({
        id: 'stubToolPages',
        match: GraphNodeMatcher.whenNodeType(STUB_TOOLS_TYPE),
        connector: () =>
          Effect.succeed(
            STUB_TOOL_PAGES.map((page, index) =>
              AppGraphNode.make({
                id: page.id,
                type: 'stub-tool',
                data: page.data,
                properties: { label: page.label, icon: 'ph--flask--regular', position: index },
              }),
            ),
          ),
      }),
    ]);
    return [Capability.contribute(AppCapabilities.AppGraphBuilder, extensions.flat())];
  }),
);

const stubSurfaces = Capability.inlineModule('stub-tools-surfaces', { provides: [Capabilities.ReactSurface] }, () =>
  Effect.succeed([
    Capability.contribute(
      Capabilities.ReactSurface,
      STUB_TOOL_PAGES.map((page) =>
        Surface.create({
          id: `stubTool.${page.id}`,
          filter: AppSurface.literal(DebugSurface.Page, page.data),
          component: () => <div data-testid={`stubTool.${page.id}`}>{page.label}</div>,
        }),
      ),
    ),
  ]),
);

/**
 * Stands in for devtools in stories: a `tools` branch under the hidden debug category holding two
 * pages whose articles are their labels, so the debug panel's tree has a branch to toggle and a
 * page to select without the real plugin's client and space.
 */
export const StubToolsPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.debug.story.stubTools'), name: 'Stub tools' }),
).pipe(Plugin.addModule(stubGraphBuilder), Plugin.addModule(stubSurfaces), Plugin.make);
