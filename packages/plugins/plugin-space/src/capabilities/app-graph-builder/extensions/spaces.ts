//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, getActiveSpace, getPersonalSpace, isPersonalSpace } from '@dxos/app-toolkit';
import { type Space, SpaceState } from '@dxos/client/echo';
import { Filter, Obj } from '@dxos/echo';
import { AtomObj, AtomQuery } from '@dxos/echo-atom';
import { Migrations } from '@dxos/migrations';
import { Operation } from '@dxos/operation';
import { ClientCapabilities } from '@dxos/plugin-client/types';
import { CreateAtom, Graph, GraphBuilder, Node, NodeMatcher } from '@dxos/plugin-graph';
import { Expando } from '@dxos/schema';

import { meta } from '#meta';
import { SPACE_TYPE, SpaceCapabilities } from '#types';
import { SpaceOperation } from '#operations';
import { SHARED, getSpaceDisplayName } from '../../../util';

import {
  CACHEABLE_PROPS,
  CAN_DROP_SPACE,
  CREATE_OBJECT_IN_SPACE_LABEL,
  MIGRATE_SPACE_LABEL,
  RENAME_SPACE_LABEL,
  SETTINGS_PANEL_LABEL,
  checkPendingMigration,
  spaceActionsCache,
  spaceRearrangeCache,
  whenSpace,
} from './shared';

//
// Extension Factory
//

/** Creates space-related extensions: primary actions, space nodes, and space actions. */
export const createSpaceExtensions = Effect.fnUntraced(function* () {
  const capabilities = yield* Capability.Service;

  return yield* Effect.all([
    GraphBuilder.createExtension({
      id: `${meta.id}.primary-actions`,
      position: 'hoist',
      match: NodeMatcher.whenRoot,
      actions: () =>
        Effect.succeed([
          {
            id: SpaceOperation.OpenCreateSpace.meta.key,
            data: () => Operation.invoke(SpaceOperation.OpenCreateSpace),
            properties: {
              label: ['create-space.label', { ns: meta.id }],
              icon: 'ph--plus--regular',
              testId: 'spacePlugin.createSpace',
              disposition: 'menu',
            },
          },
          {
            id: SpaceOperation.Join.meta.key,
            data: () => Operation.invoke(SpaceOperation.Join, {}),
            properties: {
              label: ['join-space.label', { ns: meta.id }],
              icon: 'ph--sign-in--regular',
              testId: 'spacePlugin.joinSpace',
              disposition: 'menu',
            },
          },
          {
            id: SpaceOperation.OpenMembers.meta.key,
            data: Effect.fnUntraced(function* () {
              const client = yield* Capability.get(ClientCapabilities.Client);
              const space = getActiveSpace(client, capabilities) ?? getPersonalSpace(client);
              if (space) {
                yield* Operation.invoke(SpaceOperation.OpenMembers, { space });
              }
            }),
            properties: {
              label: ['share-space.label', { ns: meta.id }],
              icon: 'ph--users--regular',
              testId: 'spacePlugin.shareSpace',
              keyBinding: {
                macos: 'meta+.',
                windows: 'alt+.',
              },
            },
          },
          {
            id: SpaceOperation.OpenSettings.meta.key,
            data: Effect.fnUntraced(function* () {
              const client = yield* Capability.get(ClientCapabilities.Client);
              const space = getActiveSpace(client, capabilities) ?? getPersonalSpace(client);
              if (space) {
                yield* Operation.invoke(SpaceOperation.OpenSettings, { space });
              }
            }),
            properties: {
              label: ['open-current-space-settings.label', { ns: meta.id }],
              icon: 'ph--faders--regular',
              keyBinding: {
                macos: 'meta+shift+,',
                windows: 'ctrl+shift+,',
              },
            },
          },
        ]),
    }),

    GraphBuilder.createExtension({
      id: `${meta.id}.spaces`,
      match: NodeMatcher.whenRoot,
      connector: (_node, get) => {
        const client = capabilities.get(ClientCapabilities.Client);
        const stateAtom = capabilities.get(SpaceCapabilities.State);
        const ephemeralAtom = capabilities.get(SpaceCapabilities.EphemeralState);
        const spacesAtom = CreateAtom.fromObservable(client.spaces);

        const spaces = get(spacesAtom);
        const personalSpace = getPersonalSpace(client);

        if (!spaces || !personalSpace) {
          return Effect.succeed([]);
        }

        const settingsAtom = capabilities.get(SpaceCapabilities.Settings);
        const settings = get(settingsAtom);
        const state = get(stateAtom);
        const ephemeralState = get(ephemeralAtom);

        try {
          const [spacesOrder] = get(AtomQuery.make(personalSpace.db, Filter.type(Expando.Expando, { key: SHARED })));
          const { graph } = capabilities.get(AppCapabilities.AppGraph);

          const spacesOrderSnapshot = spacesOrder ? get(AtomObj.make(spacesOrder)) : undefined;
          const order: string[] = (spacesOrderSnapshot as any)?.order ?? [];
          const orderMap = new Map(order.map((id, index) => [id, index]));

          const spaceStates = spaces.map((space) => get(CreateAtom.fromObservable(space.state)));

          spaces.forEach((space) => {
            if (space.state.get() === SpaceState.SPACE_READY) {
              get(AtomObj.make(space.properties));
            }
          });

          return Effect.succeed(
            [
              ...spaces
                .filter((space) => orderMap.has(space.id))
                .sort((sortA, sortB) => orderMap.get(sortA.id)! - orderMap.get(sortB.id)!),
              ...spaces.filter((space) => !orderMap.has(space.id)),
            ]
              .filter((space, idx) => (settings?.showHidden ? true : spaceStates[idx] !== SpaceState.SPACE_INACTIVE))
              .filter((space) => space.tags.length === 0 || isPersonalSpace(space))
              .map((space) =>
                constructSpaceNode({
                  space,
                  navigable: ephemeralState.navigableCollections,
                  personal: isPersonalSpace(space),
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
      // TODO(graph-path-ids): Resolver temporarily disabled; redesign needed for path-based IDs.
      // resolver: (id, get) => { ... },
    }),

    GraphBuilder.createExtension({
      id: `${meta.id}.actions`,
      match: whenSpace,
      actions: (space, get) => {
        const [client] = get(capabilities.atom(ClientCapabilities.Client));
        const ephemeralAtom = capabilities.get(SpaceCapabilities.EphemeralState);
        const ephemeralState = get(ephemeralAtom);

        if (!client) {
          return Effect.succeed([]);
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
  personal,
  namesCache,
  graph,
  spacesOrder,
}: {
  space: Space;
  navigable?: boolean;
  personal?: boolean;
  namesCache?: Record<string, string>;
  graph?: Graph.ExpandableGraph;
  spacesOrder?: Obj.Any;
}) => {
  const hasPendingMigration = checkPendingMigration(space);

  let onRearrange: ((nextOrder: Space[]) => void) | undefined;
  if (graph && spacesOrder) {
    onRearrange = spaceRearrangeCache.get(space.id);
    if (!onRearrange) {
      onRearrange = (nextOrder: Space[]) => {
        Graph.sortEdges(
          graph,
          Node.RootId,
          'outbound',
          nextOrder.map(({ id }) => id),
        );

        Obj.change(spacesOrder, (mutableOrder: any) => {
          mutableOrder.order = nextOrder.map(({ id }) => id);
        });
      };
      spaceRearrangeCache.set(space.id, onRearrange);
    }
  }

  return Node.make({
    id: space.id,
    type: SPACE_TYPE,
    cacheable: CACHEABLE_PROPS,
    data: space,
    properties: {
      label: getSpaceDisplayName(space, { personal, namesCache }),
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
    nodes: [
      Node.make({
        id: 'settings',
        type: `${meta.id}.settings`,
        data: null,
        properties: {
          label: SETTINGS_PANEL_LABEL,
          icon: 'ph--faders--regular',
          disposition: 'alternate-tree',
          space,
        },
      }),
    ],
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

  const actions: Node.NodeArg<Node.ActionData<Operation.Service>>[] = [];

  if (hasPendingMigration) {
    actions.push(
      Node.make({
        id: SpaceOperation.Migrate.meta.key,
        type: Node.ActionGroupType,
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
      Node.makeAction({
        id: SpaceOperation.OpenCreateObject.meta.key,
        data: () => Operation.invoke(SpaceOperation.OpenCreateObject, { target: space.db }),
        properties: {
          label: CREATE_OBJECT_IN_SPACE_LABEL,
          icon: 'ph--plus--regular',
          disposition: 'list-item-primary',
          testId: 'spacePlugin.createObject',
        },
      }),
      Node.makeAction({
        id: SpaceOperation.Rename.meta.key,
        data: (params?: Node.InvokeProps) =>
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
