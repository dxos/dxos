//
// Copyright 2025 DXOS.org
//

// App graph builder capability module.
// The app graph is the data structure that drives the navigation tree, actions, and companions.
// Plugins contribute graph extensions that add nodes, actions, and companion panels.
// Extensions are composed across all plugins to build the complete application graph.

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode, createObjectNode } from '@dxos/app-toolkit';
import { type Space, isSpace } from '@dxos/client/echo';
import { Filter } from '@dxos/echo';
import { AtomQuery } from '@dxos/echo-atom';
import { Operation } from '@dxos/operation';
import { GraphBuilder, Node, NodeMatcher } from '@dxos/plugin-graph';
import { SPACE_TYPE } from '@dxos/plugin-space/types';

import { meta } from '#meta';
import { ExemplarOperation } from '#operations';
import { ExemplarItem } from '#types';

// Custom matcher for Space nodes. Extracts the Space object from the node
// so downstream connector/actions receive it as a typed value.
const whenSpace = (node: Node.Node): Option.Option<Space> =>
  node.type === SPACE_TYPE && isSpace(node.data) ? Option.some(node.data) : Option.none();

// Section type constant used to identify the "Exemplars" section node.
// A second extension matches this type to populate child nodes.
const EXEMPLAR_SECTION_TYPE = 'exemplar-section';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;

    // Metadata resolver used by `createObjectNode` to look up icons and labels.
    const resolve = (typename: string) =>
      capabilities.getAll(AppCapabilities.Metadata).find(({ id }) => id === typename)?.metadata ?? {};

    const extensions = yield* Effect.all([
      // --- Root-level action ---
      // `NodeMatcher.whenRoot` matches the graph root, making this action appear
      // in the global action menu (e.g., the "+" button in the navigation tree).
      // `position: 'hoist'` places the action in the primary action area.
      GraphBuilder.createExtension({
        id: 'root-actions',
        position: 'hoist',
        match: NodeMatcher.whenRoot,
        actions: () =>
          Effect.succeed([
            // `Node.makeAction` creates an action node in the graph.
            // `data` is a function (or Effect) invoked when the action is triggered.
            // `properties` define the UI presentation: label, icon, disposition.
            Node.makeAction({
              id: ExemplarOperation.CreateExemplarItem.meta.key,
              data: () => Operation.invoke(ExemplarOperation.CreateExemplarItem, {}),
              properties: {
                label: ['create-exemplar-item.label', { ns: meta.id }],
                icon: 'ph--book-open--regular',
                testId: 'exemplarPlugin.createItem',
                // `disposition: 'menu'` places the action in the dropdown menu.
                // Other options: 'toolbar' (always visible), 'hidden' (only programmatic).
                disposition: 'menu',
              },
            }),
          ]),
      }),

      // --- Sub-graph section ---
      // Creates an "Exemplars" section node under each space in the navigation tree.
      // This matches Space nodes and returns a section node when ExemplarItem objects exist.
      // `AppNode.makeSection` builds a virtual branch node (non-navigable, non-draggable).
      GraphBuilder.createExtension({
        id: 'section',
        match: whenSpace,
        connector: (space, get) => {
          const items = get(AtomQuery.make(space.db, Filter.type(ExemplarItem.ExemplarItem)));
          if (items.length === 0) {
            return Effect.succeed([]);
          }

          return Effect.succeed([
            AppNode.makeSection({
              id: 'exemplar-section',
              type: EXEMPLAR_SECTION_TYPE,
              label: ['plugin.name', { ns: meta.id }],
              icon: 'ph--book-open--regular',
              space,
            }),
          ]);
        },
      }),

      // --- Section children ---
      // Populates ExemplarItem objects as child nodes under the section.
      // Matches nodes of `EXEMPLAR_SECTION_TYPE` and queries the space's database.
      // `createObjectNode` builds a standard app-graph node using the registered metadata.
      GraphBuilder.createExtension({
        id: 'section-items',
        match: (node) => {
          const space = isSpace(node.properties.space) ? node.properties.space : undefined;
          return node.type === EXEMPLAR_SECTION_TYPE && space ? Option.some(space) : Option.none();
        },
        connector: (space, get) => {
          const items = get(AtomQuery.make(space.db, Filter.type(ExemplarItem.ExemplarItem)));
          return Effect.succeed(
            items
              .map((item) => createObjectNode({ db: space.db, object: item, resolve }))
              .filter((node): node is NonNullable<typeof node> => node !== null),
          );
        },
      }),

      // --- Type-specific actions ---
      // `GraphBuilder.createTypeExtension` is a convenience that matches nodes whose data
      // is an ECHO object of the specified type. The callback receives the typed object.
      GraphBuilder.createTypeExtension({
        id: 'item-actions',
        type: ExemplarItem.ExemplarItem,
        actions: (item) =>
          Effect.succeed([
            Node.makeAction({
              id: 'randomize',
              data: () => Operation.invoke(ExemplarOperation.Randomize, { item }),
              properties: {
                label: ['randomize-item.label', { ns: meta.id }],
                icon: 'ph--shuffle--regular',
                // `disposition: 'toolbar'` makes the action appear in the article toolbar
                // but not in the navtree context menu.
                disposition: 'toolbar',
              },
            }),
            Node.makeAction({
              id: 'archive',
              data: () => Operation.invoke(ExemplarOperation.UpdateStatus, { item, status: 'archived' }),
              properties: {
                label: ['archive-item.label', { ns: meta.id }],
                icon: 'ph--archive--regular',
                // `disposition: 'list-item'` makes the action appear in the navtree context menu
                // but not in the article toolbar.
                disposition: 'list-item',
              },
            }),
          ]),
      }),

      // --- Plank companion ---
      // Companions are side panels attached to a specific object.
      // `AppNode.makeCompanion` creates a companion node with the `PLANK_COMPANION_TYPE`.
      // The `data` string identifies which companion surface to render (matched by the
      // `literalArticle` filter in react-surface.tsx).
      GraphBuilder.createTypeExtension({
        id: 'related-companion',
        type: ExemplarItem.ExemplarItem,
        connector: () =>
          Effect.succeed([
            AppNode.makeCompanion({
              id: 'related',
              label: ['related-companion.label', { ns: meta.id }],
              icon: 'ph--users-three--regular',
              data: 'related',
            }),
          ]),
      }),

      // --- Deck companion ---
      // Deck companions are workspace-wide panels (not attached to a specific object).
      // `AppNode.makeDeckCompanion` creates a node with `DECK_COMPANION_TYPE`.
      // The surface role follows the convention: `deck-companion--{id}`.
      // `position: 'fallback'` places it after higher-priority companions.
      GraphBuilder.createExtension({
        id: 'deck-companion',
        match: NodeMatcher.whenRoot,
        connector: () =>
          Effect.succeed([
            AppNode.makeDeckCompanion({
              id: 'exemplar-panel',
              label: ['deck-companion.label', { ns: meta.id }],
              icon: 'ph--book-open--regular',
              data: 'exemplar-panel' as const,
              position: 'fallback',
            }),
          ]),
      }),
    ]);

    // All extensions are flattened and contributed as a single array.
    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions.flat());
  }),
);
