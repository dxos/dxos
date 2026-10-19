//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Queue from 'effect/Queue';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import { Context } from '@dxos/context';
import { BaseError } from '@dxos/errors';
import { IdentityDid, type PublicKey, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { EdgeCallFailedError } from '@dxos/protocols';
import { toPublicKey } from '@dxos/protocols/buf';

import { AgentSpace } from '#types';

/** A request to EDGE as the client's EDGE HTTP client makes it: it answers the envelope's data, or rejects. */
export type EdgeRequest = (
  path: string,
  init: { method: 'GET' | 'POST' | 'DELETE'; body?: Record<string, unknown> },
) => Promise<unknown>;

/** `GET /compute/brain/:agent`, as far as confirming the agent's space reads it. */
const BrainInfo = Schema.Struct({
  identity: Schema.Struct({ identityDid: Schema.String, defaultSpaceId: Schema.String }),
  role: Schema.String,
});

type Change = 'listed' | 'delisted';

/** EDGE did not take a change to an agent's admins. */
class AdminChangeFailedError extends BaseError.extend(
  'AdminChangeFailedError',
  "EDGE did not take the agent's admin change.",
) {}

/**
 * EDGE answers 404 where it keeps no list (an EDGE from before `AgentAdmins`) or the caller is not the agent's admin, and
 * 409 for the agent's last admin: telling it again would get the same answer.
 */
const isSettled = (error: AdminChangeFailedError): boolean =>
  error.cause instanceof EdgeCallFailedError && (error.cause.status === 404 || error.cause.status === 409);

/**
 * Keeps EDGE's list of each agent's admins, which EDGE checks the admin role against, in step with the agent's space as
 * this client sees it: the space's admins and editors are listed, and its readers and the members removed from it are
 * delisted. Each change is told once a session; one EDGE did not take is told again on the next pass.
 */
export const makeAdminSync = (request: EdgeRequest) => {
  /** Agent spaces EDGE confirmed are their agent's own, with this identity its admin. */
  const confirmed = new Set<SpaceId>();
  /** What this client has told EDGE of each agent space's members, by identity key. */
  const told = new Map<SpaceId, Map<string, Change>>();

  /** A space can claim to be any agent's: EDGE, which minted the agent's space, must name it. */
  const confirm = (space: AgentSpace.Space, did: IdentityDid) =>
    Effect.tryPromise(() => request(`/compute/brain/${encodeURIComponent(did)}`, { method: 'GET' })).pipe(
      Effect.flatMap(Schema.decodeUnknownEffect(BrainInfo)),
      Effect.map(
        ({ identity, role }) =>
          identity.identityDid === did && identity.defaultSpaceId === space.id && role === 'admin',
      ),
      Effect.orElseSucceed(() => false),
    );

  /** Whether EDGE took the change or settled it already. */
  const tell = (did: IdentityDid, identityKey: string, change: Change) =>
    Effect.tryPromise({
      try: () =>
        change === 'listed'
          ? request(`/compute/brain/${encodeURIComponent(did)}/admins`, { method: 'POST', body: { identityKey } })
          : request(`/compute/brain/${encodeURIComponent(did)}/admins/${identityKey}`, { method: 'DELETE' }),
      catch: (cause) => new AdminChangeFailedError({ cause }),
    }).pipe(
      Effect.as(true),
      Effect.catchIf(isSettled, () => Effect.succeed(true)),
      Effect.catchCause((cause) =>
        Cause.hasInterruptsOnly(cause)
          ? Effect.failCause(cause)
          : Effect.sync(() => {
              log.warn('agent admin change not taken by EDGE', { did, change, cause: Cause.pretty(cause) });
              return false;
            }),
      ),
    );

  return Effect.fnUntraced(function* (spaces: readonly AgentSpace.Space[], self: PublicKey) {
    for (const space of AgentSpace.administeredBy(spaces, self)) {
      const did = AgentSpace.agentOf(space)?.identity?.did;
      if (!IdentityDid.isValid(did)) {
        continue;
      }
      if (!confirmed.has(space.id)) {
        if (!(yield* confirm(space, did))) {
          continue;
        }
        confirmed.add(space.id);
      }

      const toldSpace = told.get(space.id) ?? new Map<string, Change>();
      told.set(space.id, toldSpace);
      const changes = [
        ...AgentSpace.admins(space).map((member) => ({ member, change: 'listed' as const })),
        ...AgentSpace.formerAdmins(space).map((member) => ({ member, change: 'delisted' as const })),
      ];
      for (const { member, change } of changes) {
        const identityKey = toPublicKey(member.identity?.identityKey)?.toHex();
        if (identityKey && toldSpace.get(identityKey) !== change && (yield* tell(did, identityKey, change))) {
          toldSpace.set(identityKey, change);
        }
      }
    }
  });
};

/**
 * Runs the admin sync whenever the client's spaces, or the members of an agent space among them, change. Only an
 * admin's client tells EDGE anything, and a headless host administers no agent.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    const edge = yield* Capability.getOption(ClientCapabilities.EdgeHttpClient);
    if (Option.isNone(edge)) {
      return [];
    }

    const sync = makeAdminSync((path, init) => edge.value.request(Context.default(), path, init));
    const wake = yield* Queue.sliding<void>(1);
    const notify = () => void Queue.offerUnsafe(wake, undefined);
    // An agent space's members change without the list of spaces changing, so each agent space is watched too.
    const watched = new Map<SpaceId, { unsubscribe: () => void }>();
    let spaces = client.spaces.subscribe(notify);
    const unwatch = () => {
      spaces.unsubscribe();
      watched.forEach((subscription) => subscription.unsubscribe());
      watched.clear();
    };
    // The client replaces its space list when its services reconnect, so the subscriptions follow it.
    const unsubscribeReloaded = client.reloaded.on(() => {
      unwatch();
      spaces = client.spaces.subscribe(notify);
      notify();
    });
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        unsubscribeReloaded();
        unwatch();
      }),
    );

    yield* Effect.forkScoped(
      Effect.forever(
        Effect.gen(function* () {
          yield* Queue.take(wake);
          for (const space of client.spaces.get()) {
            if (AgentSpace.isAgentSpace(space) && !watched.has(space.id)) {
              watched.set(space.id, space.members.subscribe(notify));
            }
          }
          const self = toPublicKey(client.halo.identity.get()?.identityKey);
          if (self) {
            yield* sync(client.spaces.get(), self);
          }
        }),
      ),
    );
    notify();

    return [];
  }),
);
