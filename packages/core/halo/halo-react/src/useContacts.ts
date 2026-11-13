//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Option from 'effect/Option';
import * as Result from 'effect/reactivity/AsyncResult';
import * as Atom from 'effect/reactivity/Atom';
import * as Stream from 'effect/Stream';
import { useMemo } from 'react';

import { Identity, Space } from '@dxos/halo';
import { type IdentityDid } from '@dxos/keys';

import { type HaloServices, useHaloServices } from './HaloProvider.tsx';

/** Someone who shares at least one ready space with the local identity. */
export type Contact = {
  readonly did: IdentityDid;
  readonly displayName?: string;
  /** Whether they are online in any of the shared spaces. */
  readonly online: boolean;
  /** The ready spaces you share with them. */
  readonly spaces: readonly Space.Info[];
};

const EMPTY: readonly Contact[] = [];

/** Merges each space's members into one contact per DID, leaving out `me`. */
const merge = (
  bySpace: readonly { space: Space.Info; members: readonly Space.Member[] }[],
  me: IdentityDid | undefined,
): readonly Contact[] => {
  const byDid = new Map<IdentityDid, Contact>();
  for (const { space, members } of bySpace) {
    for (const member of members) {
      if (!member.did || member.did === me) {
        continue;
      }
      const contact = byDid.get(member.did);
      byDid.set(member.did, {
        did: member.did,
        displayName: member.displayName ?? contact?.displayName,
        online: member.online || (contact?.online ?? false),
        spaces: [...(contact?.spaces ?? []), space],
      });
    }
  }
  return [...byDid.values()];
};

/**
 * Everyone who shares a ready space with the local identity, once each, with the spaces they share. Emits again when
 * the identity, the spaces or any space's members change.
 */
const contacts: Stream.Stream<readonly Contact[], never, HaloServices> = Stream.zipLatest(
  Identity.identity,
  Space.spaces,
).pipe(
  Stream.switchMap(([identity, spaces]) => {
    const ready = spaces.filter((space) => space.state === 'ready');
    const me = Option.getOrUndefined(identity)?.did;
    return ready.length === 0
      ? Stream.make(EMPTY)
      : Stream.zipLatestAll(
          ...ready.map((space) => Space.members(space.id).pipe(Stream.map((members) => ({ space, members })))),
        ).pipe(Stream.map((bySpace) => merge(bySpace, me)));
  }),
);

/**
 * Returns everyone the local identity shares a ready space with, once each, with the spaces they share. Reactive:
 * re-renders when a space is joined or left, or its members change.
 */
export const useContacts = (): readonly Contact[] => {
  const services = useHaloServices();
  const atom = useMemo(() => Atom.make(contacts.pipe(Stream.provideContext(services))), [services]);
  return Result.getOrElse(useAtomValue(atom), () => EMPTY);
};
