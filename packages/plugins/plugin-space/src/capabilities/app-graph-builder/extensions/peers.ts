//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import { Obj } from '@dxos/echo';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { type Label } from '@dxos/ui-types/translations';

import { SpaceCapabilities, SpaceSchema } from '#types';

import { SpaceNamespace } from '../../../namespace.ts';
import {
  MEMBERS_COMPANION_ID,
  PEER_SEGMENT_PREFIX,
  getPeerFocus,
  getPresenceKeyFromPath,
  getSpacePeers,
} from '../../../util/presence.ts';

const JUMP_LABEL: Label = ['presence-jump.label', { ns: SpaceNamespace.key }];
const GO_TO_LABEL: Label = ['presence-go-to.label', { ns: SpaceNamespace.key }];

const isPeerNodeData = Schema.is(SpaceSchema.PeerNodeData);

/** The Members deck companion, and a hidden node per peer in a space carrying the actions on that peer. */
export const createPeerExtensions = Effect.fnUntraced(function* () {
  const capabilities = yield* Capability.Service;
  const ephemeralCapAtom = yield* Capability.atom(SpaceCapabilities.EphemeralState);
  const layoutCapAtom = yield* Capability.atom(AppCapabilities.Layout);

  return yield* Effect.all([
    AppGraphBuilder.createExtension({
      id: 'membersCompanion',
      relation: AppNode.companion,
      match: GraphNodeMatcher.whenRoot,
      connector: () =>
        Effect.succeed([
          AppNode.makeDeckCompanion({
            id: MEMBERS_COMPANION_ID,
            label: ['members-companion.label', { ns: SpaceNamespace.key }],
            icon: 'ph--users--regular',
            data: null,
            // After Notifications (-2), ahead of the unordered companions.
            position: -1,
          }),
        ]),
    }),

    AppGraphBuilder.createExtension({
      id: 'peers',
      match: AppNodeMatcher.whenSpace,
      connector: (space, get) => {
        const [ephemeralAtom] = get(ephemeralCapAtom);
        if (!ephemeralAtom) {
          return Effect.succeed([]);
        }

        const peers = getSpacePeers(get(ephemeralAtom).viewersByObject, space.id, Date.now());
        return Effect.succeed(
          peers.map(
            (identityKey) =>
              ({
                id: `${PEER_SEGMENT_PREFIX}${identityKey}`,
                type: SpaceSchema.PEER_NODE_TYPE,
                data: { spaceId: space.id, identityKey },
                properties: { label: identityKey, disposition: 'hidden' },
              }) satisfies AppGraphNode.NodeArg<SpaceSchema.PeerNodeData>,
          ),
        );
      },
    }),

    // Jump when the peer's object is open in this deck; otherwise Go to opens it.
    AppGraphBuilder.createExtension({
      id: 'peerActions',
      match: (node) =>
        node.type === SpaceSchema.PEER_NODE_TYPE && isPeerNodeData(node.data) ? Option.some(node.data) : Option.none(),
      actions: ({ spaceId, identityKey }, get) => {
        const [ephemeralAtom] = get(ephemeralCapAtom);
        const [layoutAtom] = get(layoutCapAtom);
        const [appGraph] = get(capabilities.atom(AppCapabilities.AppGraph));
        if (!ephemeralAtom || !layoutAtom || !appGraph) {
          return Effect.succeed([]);
        }

        const focus = getPeerFocus(get(ephemeralAtom).viewersByObject, spaceId, identityKey, Date.now());
        if (!focus) {
          return Effect.succeed([]);
        }

        const openPath = get(layoutAtom).active.find((path) => getPresenceKeyFromPath(path) === focus.key);
        if (openPath) {
          const node = Option.getOrUndefined(get(appGraph.graph.node(openPath)));
          const typename = node && Obj.isObject(node.data) ? Obj.getTypename(node.data) : undefined;
          const locator = get(capabilities.atom(AppCapabilities.Locator)).find(({ id }) => id === typename);
          const anchor = focus.location?.selection ?? focus.location?.viewport;
          return Effect.succeed(
            locator && anchor
              ? [
                  AppGraphNode.makeAction({
                    id: 'jump',
                    data: () => Operation.invoke(locator.reveal, { subject: openPath, anchor }),
                    properties: {
                      label: JUMP_LABEL,
                      icon: 'ph--crosshair-simple--regular',
                      disposition: 'list-item',
                      testId: 'spacePlugin.presence.jump',
                    },
                  }),
                ]
              : [],
          );
        }

        return Effect.succeed([
          AppGraphNode.makeAction({
            id: 'goTo',
            data: () =>
              Effect.gen(function* () {
                const client = yield* Capability.get(ClientCapabilities.Client);
                const space = client.spaces.get().find((space) => space.id === spaceId);
                if (!space) {
                  return;
                }

                const object = yield* Effect.promise(() => space.db.makeRef(focus.key).load());
                if (!Obj.isObject(object)) {
                  return;
                }

                yield* Operation.invoke(LayoutOperation.Open, { subject: [GraphPath.getObjectPathFromObject(object)] });
              }),
            properties: {
              label: GO_TO_LABEL,
              icon: 'ph--arrow-right--regular',
              disposition: 'list-item',
              testId: 'spacePlugin.presence.goTo',
            },
          }),
        ]);
      },
    }),
  ]);
});
