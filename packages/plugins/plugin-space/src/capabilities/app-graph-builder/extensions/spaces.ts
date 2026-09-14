//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as CreateAtom from '@dxos/app-graph/CreateAtom';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import { type Space, SpaceState } from '@dxos/client/echo';
import * as Operation from '@dxos/compute/Operation';
import { Filter, Obj } from '@dxos/echo';
import * as GraphNode from '@dxos/graph/GraphNode';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';
import { Migrations } from '@dxos/migrations';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { SpacesService } from '@dxos/protocols/rpc';
import { Expando } from '@dxos/schema';
import { Position } from '@dxos/util';

import { meta } from '#meta';
import { SpaceCapabilities, SpaceOperation, SpaceSchema } from '#types';

import { getSpaceDisplayName } from '../../../util/index.ts';
import {
  CAN_DROP_SPACE,
  CREATE_OBJECT_IN_SPACE_LABEL,
  MIGRATE_SPACE_LABEL,
  RENAME_SPACE_LABEL,
  checkPendingMigration,
  spaceActionsCache,
  spaceRearrangeCache,
} from './shared.ts';

//
// Extension Factory
//

// The label tuple must be a module-level singleton: connectors re-evaluate whenever the matched
// node emits, and a tuple rebuilt inline each time creates a new array reference, causing the graph
// to re-emit the node and remount the Home article on every evaluation.
const SPACE_HOME_NODE_LABEL = ['space-home-node.label', { ns: meta.profile.key }] as const;

/** Creates space-related extensions: primary actions, space nodes, space actions, and the Home node. */
export const createSpaceExtensions = Effect.fnUntraced(function* () {
  const capabilities = yield* Capability.Service;
  // Hoisted so connector/action bodies read reactively via `get(...)` instead of a sync
  // `Capability.get`, establishing a dependency that heals once the capability lands.
  const clientAtom = yield* Capability.atom(ClientCapabilities.Client);
  const stateCapAtom = yield* Capability.atom(SpaceCapabilities.State);
  const ephemeralCapAtom = yield* Capability.atom(SpaceCapabilities.EphemeralState);
  const settingsCapAtom = yield* Capability.atom(SpaceCapabilities.SettingsAtom);
  const appGraphAtom = yield* Capability.atom(AppCapabilities.AppGraph);

  return yield* Effect.all([
    AppGraphBuilder.createExtension({
      id: 'spaceHome',
      position: Position.first,
      url: { key: 'home', kind: 'singleton', path: [] },
      match: AppNodeMatcher.whenSpace,
      connector: (space) =>
        Effect.succeed([
          {
            id: GraphPath.SPACE_HOME_SEGMENT,
            type: SpaceSchema.SPACE_HOME_NODE_TYPE,
            data: SpaceSchema.SPACE_HOME_NODE_TYPE,
            properties: {
              label: SPACE_HOME_NODE_LABEL,
              icon: 'ph--house--regular',
              iconHue: 'emerald',
              position: Position.first,
              draggable: false,
              droppable: false,
              space,
            },
          } satisfies AppGraphNode.NodeArg<typeof SpaceSchema.SPACE_HOME_NODE_TYPE>,
        ]),
    }),

    AppGraphBuilder.createExtension({
      id: 'primaryActions',
      position: Position.first,
      match: GraphNodeMatcher.whenRoot,
      actions: () =>
        Effect.succeed([
          AppGraphNode.makeAction({
            id: SpaceOperation.OpenCreateSpace.meta.key,
            data: () => Operation.invoke(SpaceOperation.OpenCreateSpace),
            properties: {
              label: ['create-space.label', { ns: meta.profile.key }],
              icon: 'ph--plus--regular',
              testId: 'spacePlugin.createSpace',
              disposition: 'menu',
            },
          }),
          AppGraphNode.makeAction({
            id: SpaceOperation.Join.meta.key,
            data: () => Operation.invoke(SpaceOperation.Join, {}),
            properties: {
              label: ['join-space.label', { ns: meta.profile.key }],
              icon: 'ph--sign-in--regular',
              testId: 'spacePlugin.joinSpace',
              disposition: 'menu',
            },
          }),
          AppGraphNode.makeAction({
            id: SpaceOperation.OpenImportSpace.meta.key,
            data: () => Operation.invoke(SpaceOperation.OpenImportSpace),
            properties: {
              label: ['import-space.label', { ns: meta.profile.key }],
              icon: 'ph--upload--regular',
              testId: 'spacePlugin.importSpace',
            },
          }),
          AppGraphNode.makeAction({
            id: `${SpaceOperation.ExportSpace.meta.key}.binary`,
            data: Effect.fnUntraced(function* () {
              const client = yield* Capability.get(ClientCapabilities.Client);
              const space = AppSpace.getActiveSpace(client, capabilities) ?? AppSpace.getDefaultSpace(client);
              if (space) {
                yield* Operation.invoke(SpaceOperation.ExportSpace, {
                  space,
                  format: SpacesService.SpaceArchiveFormat.enums.BINARY,
                });
              }
            }),
            properties: {
              label: ['export-space-binary.label', { ns: meta.profile.key }],
              icon: 'ph--download--regular',
              testId: 'spacePlugin.exportSpaceBinary',
            },
          }),
          AppGraphNode.makeAction({
            id: `${SpaceOperation.ExportSpace.meta.key}.json`,
            data: Effect.fnUntraced(function* () {
              const client = yield* Capability.get(ClientCapabilities.Client);
              const space = AppSpace.getActiveSpace(client, capabilities) ?? AppSpace.getDefaultSpace(client);
              if (space) {
                yield* Operation.invoke(SpaceOperation.ExportSpace, {
                  space,
                  format: SpacesService.SpaceArchiveFormat.enums.JSON,
                });
              }
            }),
            properties: {
              label: ['export-space-json.label', { ns: meta.profile.key }],
              icon: 'ph--download--regular',
              testId: 'spacePlugin.exportSpaceJson',
            },
          }),
          AppGraphNode.makeAction({
            id: SpaceOperation.OpenMembers.meta.key,
            data: Effect.fnUntraced(function* () {
              const client = yield* Capability.get(ClientCapabilities.Client);
              const space = AppSpace.getActiveSpace(client, capabilities) ?? AppSpace.getDefaultSpace(client);
              if (space) {
                yield* Operation.invoke(SpaceOperation.OpenMembers, { space });
              }
            }),
            properties: {
              label: ['share-space.label', { ns: meta.profile.key }],
              icon: 'ph--users--regular',
              testId: 'spacePlugin.shareSpace',
              keyBinding: {
                macos: 'meta+.',
                windows: 'alt+.',
              },
            },
          }),
          AppGraphNode.makeAction({
            id: SpaceOperation.OpenSettings.meta.key,
            data: Effect.fnUntraced(function* () {
              const client = yield* Capability.get(ClientCapabilities.Client);
              const space = AppSpace.getActiveSpace(client, capabilities) ?? AppSpace.getDefaultSpace(client);
              if (space) {
                yield* Operation.invoke(SpaceOperation.OpenSettings, { space });
              }
            }),
            properties: {
              label: ['open-current-space-settings.label', { ns: meta.profile.key }],
              icon: 'ph--faders--regular',
              keyBinding: {
                macos: 'meta+shift+,',
                windows: 'ctrl+shift+,',
              },
            },
          }),
        ]),
    }),

    AppGraphBuilder.createExtension({
      id: 'spaces',
      match: GraphNodeMatcher.whenRoot,
      connector: (_node, get) => {
        // This reactive connector can recompute once during the teardown window (e.g. when stories
        // swap plugin managers) after the Client capability has been removed; the hoisted atom
        // resolves to an empty array rather than throwing in that case.
        const [client] = get(clientAtom);
        if (!client) {
          return Effect.succeed([]);
        }
        const [stateAtom] = get(stateCapAtom);
        const [ephemeralAtom] = get(ephemeralCapAtom);
        if (!stateAtom || !ephemeralAtom) {
          return Effect.succeed([]);
        }
        const spacesAtom = CreateAtom.fromObservable(client.spaces);

        const spaces = get(spacesAtom);
        if (!spaces) {
          return Effect.succeed([]);
        }

        // Cross-space ordering lives in the settings space; until it exists and opens (or before
        // the migration has run) spaces simply render in their natural order. `spacesAtom` covers
        // the space appearing; its state is read through an atom so the ordering also appears when
        // an already-listed settings space finishes opening.
        const settingsSpace = AppSpace.getSettingsSpace(client);
        const settingsSpaceState = settingsSpace ? get(CreateAtom.fromObservable(settingsSpace.state)) : undefined;
        const orderingSpace = settingsSpaceState === SpaceState.SPACE_READY ? settingsSpace : undefined;

        const [settingsAtom] = get(settingsCapAtom);
        if (!settingsAtom) {
          return Effect.succeed([]);
        }
        const settings = get(settingsAtom);
        const state = get(stateAtom);
        const ephemeralState = get(ephemeralAtom);

        try {
          const [spacesOrder] = orderingSpace
            ? get(orderingSpace.db.query(Filter.type(Expando.Expando, { key: SpaceSchema.SHARED })).atom)
            : [undefined];
          const [appGraph] = get(appGraphAtom);
          if (!appGraph) {
            return Effect.succeed([]);
          }
          const { graph } = appGraph;

          const spacesOrderSnapshot = spacesOrder ? get(Obj.atom(spacesOrder)) : undefined;
          const order: string[] = (spacesOrderSnapshot as any)?.order ?? [];
          const orderMap = new Map(order.map((id, index) => [id, index]));

          // Keyed by id rather than position: the array below is re-sorted by `orderMap`, so a
          // positional lookup would test one space's readiness against another's state.
          const spaceStates = new Map(spaces.map((space) => [space.id, get(CreateAtom.fromObservable(space.state))]));

          spaces.forEach((space) => {
            if (space.state.get() === SpaceState.SPACE_READY) {
              get(Obj.atom(space.properties));
            }
          });

          return Effect.succeed(
            [
              ...spaces
                .filter((space) => orderMap.has(space.id))
                .sort((sortA, sortB) => orderMap.get(sortA.id)! - orderMap.get(sortB.id)!),
              ...spaces.filter((space) => !orderMap.has(space.id)),
            ]
              .filter((space) => spaceStates.get(space.id) === SpaceState.SPACE_READY)
              .filter((space) => AppSpace.isVisibleSpace(space))
              .map((space) =>
                constructSpaceNode({
                  space,
                  navigable: ephemeralState.navigableCollections,
                  namesCache: state.spaceNames,
                  graph,
                  spacesOrder,
                }),
              ),
          );
        } catch {
          return Effect.succeed([]);
        }
      },
    }),

    // Communications section group — no single plugin owns this category; it lives here so the
    // group is always present when the space plugin is active. A more specific plugin (e.g. a
    // future plugin-communications) should own this once one exists.
    // TODO(wittjosiah): Move to a dedicated communications plugin when one exists.
    AppGraphBuilder.createExtension({
      id: GraphPath.GroupSegments.communications,
      match: AppNodeMatcher.whenSpace,
      connector: (space) =>
        Effect.succeed([
          AppNode.makeGroup({
            id: GraphPath.GroupSegments.communications,
            type: GraphPath.GroupTypes.communications,
            label: ['nav-tree-group-comm.label', { ns: meta.profile.key }],
            icon: 'ph--chats--regular',
            space,
            position: 100,
          }),
        ]),
    }),

    AppGraphBuilder.createExtension({
      id: 'actions',
      match: AppNodeMatcher.whenSpace,
      actions: (space, get) => {
        const [client] = get(clientAtom);
        const [ephemeralAtom] = get(ephemeralCapAtom);

        if (!client || !ephemeralAtom) {
          return Effect.succeed([]);
        }
        const ephemeralState = get(ephemeralAtom);

        // Recompute actions when a migration completes (state transition or versionProperty stamp).
        get(CreateAtom.fromObservable(space.state));
        if (space.state.get() === SpaceState.SPACE_READY) {
          get(Obj.atom(space.properties));
        }

        return Effect.succeed(
          constructSpaceActions({
            space,
            migrating: ephemeralState.sdkMigrationRunning[space.id],
          }),
        );
      },
    }),
  ]);
});

//
// Helpers
//

/** Builds an app-graph node for a space, including settings children and optional rearrange handler. */
const constructSpaceNode = ({
  space,
  navigable = false,
  namesCache,
  graph,
  spacesOrder,
}: {
  space: Space;
  navigable?: boolean;
  namesCache?: Record<string, string>;
  graph?: AppGraph.ExpandableGraph;
  spacesOrder?: Obj.Any;
}) => {
  const hasPendingMigration = checkPendingMigration(space);

  let onRearrange: ((nextOrder: Space[]) => void) | undefined;
  if (graph && spacesOrder) {
    onRearrange = spaceRearrangeCache.get(space.id);
    if (!onRearrange) {
      onRearrange = (nextOrder: Space[]) => {
        AppGraph.sortEdges(
          graph,
          GraphNode.RootId,
          'outbound',
          nextOrder.map(({ id }) => id),
        );

        Obj.update(spacesOrder, (spacesOrder: any) => {
          spacesOrder.order = nextOrder.map(({ id }) => id);
        });
      };
      spaceRearrangeCache.set(space.id, onRearrange);
    }
  }

  return AppGraphNode.make({
    id: space.id,
    type: SpaceSchema.SPACE_TYPE,
    cacheable: AppNode.CACHEABLE_PROPS,
    data: space,
    properties: {
      label: getSpaceDisplayName(space, { namesCache }),
      description: space.state.get() === SpaceState.SPACE_READY && space.properties.description,
      hue: space.state.get() === SpaceState.SPACE_READY && space.properties.hue,
      icon:
        space.state.get() === SpaceState.SPACE_READY && space.properties.icon
          ? `ph--${space.properties.icon}--regular`
          : undefined,
      iconHue: space.state.get() === SpaceState.SPACE_READY && space.properties.iconHue,
      disabled: !navigable || space.state.get() !== SpaceState.SPACE_READY || hasPendingMigration,
      disposition: 'workspace',
      testId: 'spacePlugin.space',
      onRearrange,
      canDrop: CAN_DROP_SPACE,
    },
  });
};

/** Builds the action list for a space node (migrate, create object, rename). */
const constructSpaceActions = ({ space, migrating }: { space: Space; migrating?: boolean }) => {
  const state = space.state.get();
  const hasPendingMigration = checkPendingMigration(space);
  const isMigrating = migrating || Migrations.running(space);

  const cached = spaceActionsCache.get(space.id);
  if (
    cached &&
    cached.state === state &&
    cached.hasPendingMigration === hasPendingMigration &&
    cached.migrating === isMigrating
  ) {
    return cached.actions;
  }

  const actions: AppGraphNode.NodeArg<AppGraphNode.ActionData<Operation.Service>>[] = [];

  if (hasPendingMigration) {
    actions.push(
      AppGraphNode.make({
        id: SpaceOperation.Migrate.meta.key,
        type: AppGraphNode.ActionGroupType,
        data: () => Operation.invoke(SpaceOperation.Migrate, { space }),
        properties: {
          label: MIGRATE_SPACE_LABEL,
          icon: 'ph--database--regular',
          disposition: 'list-item-primary',
          disabled: isMigrating,
        },
      }),
    );
  }

  if (state === SpaceState.SPACE_READY && !hasPendingMigration) {
    actions.push(
      AppGraphNode.makeAction({
        id: SpaceOperation.OpenObjectForm.meta.key,
        data: () => Operation.invoke(SpaceOperation.OpenObjectForm, { target: space.db }),
        properties: {
          label: CREATE_OBJECT_IN_SPACE_LABEL,
          icon: 'ph--plus--regular',
          disposition: 'list-item-primary',
          testId: 'spacePlugin.createObject',
        },
      }),
      AppGraphNode.makeAction({
        id: SpaceOperation.Rename.meta.key,
        data: (params?: AppGraphNode.InvokeProps) =>
          Operation.invoke(SpaceOperation.Rename, { space, caller: `${params?.caller}:${params?.parent?.id}` }),
        properties: {
          label: RENAME_SPACE_LABEL,
          icon: 'ph--pencil-simple-line--regular',
          keyBinding: {
            macos: 'shift+F6',
            windows: 'shift+F6',
          },
        },
      }),
    );
  }

  spaceActionsCache.set(space.id, { state, hasPendingMigration, migrating: isMigrating, actions });
  return actions;
};
