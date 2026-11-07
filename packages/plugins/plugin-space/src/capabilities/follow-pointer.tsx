//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Atom from 'effect/reactivity/Atom';
import React from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import { generateName } from '@dxos/display-name';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as Awareness from '@dxos/protocols/Awareness';
import { Attention } from '@dxos/react-ui-attention/types';
import { hexToHue } from '@dxos/util';

import { SpaceCapabilities, type SpaceSchema } from '#types';

import { FollowOverlay, type ShownPointer } from '../components/FollowOverlay/index.ts';
import { SpaceNamespace } from '../namespace.ts';
import {
  FollowPointer,
  type PlankPosition,
  POINTER_CHANNEL_KIND,
  type PointerAnchor,
  getPeerFocus,
  getPointerAnchor,
  getPresenceKeyFromPath,
  sharesFollow,
  takesPartInFollow,
  toPlankPosition,
} from '../util/index.ts';

/**
 * What the pointer is over that a peer can find by the same id: the innermost attendable naming an object (a plank),
 * else a navtree row; undefined over anything else, which places the pointer against the window.
 */
const findAnchor = (target: EventTarget | null): { anchor: PointerAnchor; element: Element } | undefined => {
  if (!(target instanceof Element)) {
    return undefined;
  }
  let element = target.closest(Attention.ATTENDABLE_SELECTOR);
  while (element) {
    const id = element.getAttribute(Attention.ATTENDABLE_ATTRIBUTE);
    if (id && getPresenceKeyFromPath(id) !== undefined) {
      return { anchor: { kind: 'plank', id }, element };
    }
    element = element.parentElement?.closest(Attention.ATTENDABLE_SELECTOR) ?? null;
  }
  const row = target.closest('[data-tree-row][data-object-id]');
  const id = row?.getAttribute('data-object-id');
  return row && id ? { anchor: { kind: 'row', id }, element: row } : undefined;
};

const getWindowBox = () => ({ left: 0, top: 0, width: window.innerWidth, height: window.innerHeight });

// A plank or row belongs to the space its graph path names; the window to every space.
const isAnchorInSpace = (anchor: PointerAnchor, spaceId: string) =>
  anchor.kind === 'window' || GraphPath.getSpaceIdFromPath(anchor.id) === spaceId;

const toAnchorFields = (anchor: PointerAnchor): Pick<FollowPointer, 'plank' | 'row'> =>
  anchor.kind === 'plank' ? { plank: anchor.id } : anchor.kind === 'row' ? { row: anchor.id } : {};

const isSamePointers = (a: readonly ShownPointer[], b: readonly ShownPointer[]) =>
  JSON.stringify(a) === JSON.stringify(b);

/**
 * Shares the pointer among the sessions in a follow, on one awareness channel per space, open only while this session
 * follows someone there or is followed there, and draws the pointers of the sessions it shares a follow with.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capabilities.AtomRegistry;
    const ephemeralAtom = yield* SpaceCapabilities.EphemeralState;
    const client = yield* ClientCapabilities.Client;
    const haloIdentity = yield* ClientCapabilities.IdentityService;

    const pointersAtom = Atom.make<readonly ShownPointer[]>([]).pipe(Atom.keepAlive);
    const channels = new Map<string, { channel: Awareness.Channel<FollowPointer>; dispose: () => void }>();
    let local: { anchor: PointerAnchor; position: PlankPosition } | undefined;

    const getIdentity = () => Option.getOrUndefined(haloIdentity.getSnapshot());

    const getValue = (spaceId: string): FollowPointer => {
      const { sessionId, following, pointerStyle } = registry.get(ephemeralAtom);
      return {
        sessionId,
        ...(pointerStyle === 'laser' && { style: pointerStyle }),
        ...(following?.spaceId === spaceId && {
          following: {
            identityKey: following.identityKey,
            ...(following.sessionId && { sessionId: following.sessionId }),
          },
        }),
        ...(local && isAnchorInSpace(local.anchor, spaceId) && { ...toAnchorFields(local.anchor), ...local.position }),
      };
    };

    const refresh = () => {
      const identity = getIdentity();
      const { sessionId, following, viewersByObject } = registry.get(ephemeralAtom);
      const now = Date.now();
      const pointers = identity?.identityKey
        ? [...channels].flatMap(([spaceId, { channel }]) => {
            const leaderSessionId =
              following?.spaceId === spaceId && !following.sessionId
                ? getPeerFocus(viewersByObject, spaceId, following.identityKey, now)?.sessionId
                : undefined;
            const viewer = { spaceId, identityKey: identity.identityKey ?? '', sessionId, following, leaderSessionId };
            return channel.getSessions().flatMap(({ peerId, info, sessionId: key, value }): ShownPointer[] =>
              value?.x !== undefined &&
              value.y !== undefined &&
              sharesFollow(viewer, { identityKey: peerId, pointer: value })
                ? [
                    {
                      key,
                      name: info.displayName || generateName(peerId),
                      hue: info.hue ?? hexToHue(peerId),
                      anchor: getPointerAnchor(value),
                      x: value.x,
                      y: value.y,
                      style: value.style ?? 'cursor',
                    },
                  ]
                : [],
            );
          })
        : [];
      if (!isSamePointers(registry.get(pointersAtom), pointers)) {
        registry.set(pointersAtom, pointers);
      }
    };

    const post = () => channels.forEach(({ channel }, spaceId) => channel.update(getValue(spaceId)));

    const open = (spaceId: string) => {
      const identity = getIdentity();
      const space = client.spaces.get().find((space) => space.id === spaceId);
      if (!identity?.identityKey || !space) {
        return;
      }
      const peerId = identity.identityKey;
      const hue = typeof identity.data?.hue === 'string' ? identity.data.hue : hexToHue(peerId);
      const channel = new Awareness.Channel({
        messenger: space,
        channel: Awareness.channelId(POINTER_CHANNEL_KIND, spaceId),
        peer: {
          peerId,
          info: {
            displayName: identity.displayName ?? generateName(peerId),
            darkColor: `var(--color-${hue}-border)`,
            lightColor: `var(--color-${hue}-border)`,
            hue,
          },
        },
        schema: FollowPointer,
      });
      const unsubscribe = channel.changed.on(refresh);
      channel.open();
      // Posting at once tells a leader who follows it, and a follower whose follow this is, before the pointer moves.
      channel.update(getValue(spaceId));
      channels.set(spaceId, {
        channel,
        dispose: () => {
          unsubscribe();
          channel.close();
        },
      });
    };

    let previous:
      | { following?: string; followedSpaces: readonly string[]; pointerStyle: SpaceSchema.PointerStyle }
      | undefined;
    const sync = () => {
      const { following, followedSpaces, pointerStyle } = registry.get(ephemeralAtom);
      const key = following && `${following.spaceId}/${following.identityKey}/${following.sessionId ?? ''}`;
      if (
        previous?.following !== key ||
        previous?.followedSpaces !== followedSpaces ||
        previous?.pointerStyle !== pointerStyle
      ) {
        previous = { following: key, followedSpaces, pointerStyle };
        const spaceIds = new Set([...(following ? [following.spaceId] : []), ...followedSpaces]);
        for (const [spaceId, { dispose }] of channels) {
          if (!takesPartInFollow(spaceId, following, followedSpaces)) {
            dispose();
            channels.delete(spaceId);
          }
        }
        for (const spaceId of spaceIds) {
          if (!channels.has(spaceId)) {
            open(spaceId);
          }
        }
        // A retargeted follow keeps its channel but names someone else, and a new pointer style goes out at once.
        post();
      }
      refresh();
    };

    const unsubscribeState = registry.subscribe(ephemeralAtom, sync);
    sync();

    // Pointer moves only, which end no follow; the throttle is the channel's.
    const onPointerMove = (event: PointerEvent) => {
      if (channels.size === 0 || event.pointerType === 'touch') {
        return;
      }
      const found = findAnchor(event.target);
      const anchor: PointerAnchor = found?.anchor ?? { kind: 'window' };
      const box = found ? found.element.getBoundingClientRect() : getWindowBox();
      const position = toPlankPosition(box, event.clientX, event.clientY);
      local = position ? { anchor, position } : undefined;
      post();
    };
    const onMouseOut = (event: MouseEvent) => {
      if (channels.size > 0 && !event.relatedTarget) {
        local = undefined;
        post();
      }
    };
    const listenerOptions = { capture: true, passive: true };
    window.addEventListener('pointermove', onPointerMove, listenerOptions);
    window.addEventListener('mouseout', onMouseOut, listenerOptions);

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        unsubscribeState();
        window.removeEventListener('pointermove', onPointerMove, listenerOptions);
        window.removeEventListener('mouseout', onMouseOut, listenerOptions);
        channels.forEach(({ dispose }) => dispose());
        channels.clear();
      }),
    );

    const Root = () => <FollowOverlay pointers={useAtomValue(pointersAtom)} />;

    return Capability.contribute(Capabilities.ReactRoot, { id: `${SpaceNamespace.key}.follow-pointer`, root: Root });
  }),
);
