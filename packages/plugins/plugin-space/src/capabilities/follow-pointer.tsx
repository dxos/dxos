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
  getPeerFocus,
  getPresenceKeyFromPath,
  sharesFollow,
  takesPartInFollow,
  toPlankPosition,
} from '../util/index.ts';

/**
 * What content the pointer is over, found by the same id on every screen in the follow: a plank's companion, named by the
 * plank it accompanies, else the innermost attendable naming an object. Undefined over chrome.
 */
const findPlank = (target: EventTarget | null): { plank: string; companion: boolean; element: Element } | undefined => {
  if (!(target instanceof Element)) {
    return undefined;
  }
  const companion = target.closest('[data-companion-of]');
  const companionOf = companion?.getAttribute('data-companion-of');
  if (companion && companionOf) {
    return { plank: companionOf, companion: true, element: companion };
  }
  let element = target.closest(Attention.ATTENDABLE_SELECTOR);
  while (element) {
    const id = element.getAttribute(Attention.ATTENDABLE_ATTRIBUTE);
    if (id && getPresenceKeyFromPath(id) !== undefined) {
      return { plank: id, companion: false, element };
    }
    element = element.parentElement?.closest(Attention.ATTENDABLE_SELECTOR) ?? null;
  }
  return undefined;
};

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
    let local: { plank: string; companion: boolean; position: PlankPosition } | undefined;

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
        ...(local &&
          GraphPath.getSpaceIdFromPath(local.plank) === spaceId && {
            plank: local.plank,
            ...(local.companion && { companion: true }),
            ...local.position,
          }),
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
              value?.plank !== undefined &&
              value.x !== undefined &&
              value.y !== undefined &&
              sharesFollow(viewer, { identityKey: peerId, pointer: value })
                ? [
                    {
                      key,
                      name: info.displayName || generateName(peerId),
                      hue: info.hue ?? hexToHue(peerId),
                      plank: value.plank,
                      companion: value.companion ?? false,
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
      // Over chrome (the navtree, sidebars, toolbars) the pointer has no position, so peers draw none.
      const found = findPlank(event.target);
      const position = found && toPlankPosition(found.element.getBoundingClientRect(), event.clientX, event.clientY);
      local = found && position ? { plank: found.plank, companion: found.companion, position } : undefined;
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
