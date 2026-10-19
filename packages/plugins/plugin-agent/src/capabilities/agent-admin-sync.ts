//
// Copyright 2026 DXOS.org
//

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

/**
 * How EDGE answered a request of the sync: it did what was asked or had already, it refused, or it was down (no answer,
 * or a 5xx), the one answer worth asking again after a pause.
 */
type Answer = 'done' | 'refused' | 'unavailable';

/** How long the sync waits to ask EDGE again what it could not reach EDGE for, unless a change wakes it first. */
const RETRY_DELAY = '30 seconds';

/** EDGE refused, or did not answer, a request of the admin sync. */
class AdminSyncRequestError extends BaseError.extend(
  'AdminSyncRequestError',
  'EDGE refused, or did not answer, a request of the agent admin sync.',
) {}

/**
 * EDGE answers 404 where it keeps no list (an EDGE from before `AgentAdmins`) or the caller is not the agent's admin, and
 * 409 for the agent's last admin: telling it again would get the same answer.
 */
const isSettled = (error: AdminSyncRequestError): boolean =>
  error.cause instanceof EdgeCallFailedError && (error.cause.status === 404 || error.cause.status === 409);

/**
 * A 4xx is EDGE refusing, and asking again gets the same answer. No answer, or a 5xx, is EDGE or the network being down,
 * which EDGE's client does not always mark retryable, so status decides.
 */
const answerTo = (error: AdminSyncRequestError): Answer => {
  const status = error.cause instanceof EdgeCallFailedError ? error.cause.status : undefined;
  return status !== undefined && status >= 400 && status < 500 ? 'refused' : 'unavailable';
};

/**
 * Keeps EDGE's list of each agent's admins, which EDGE checks the admin role against, in step with the agent's space as
 * this client sees it: the space's admins and editors are listed, and its readers and the members removed from it are
 * delisted. Each change is told once a session; one EDGE did not take is told again on the next pass. A pass answers
 * whether it could not reach EDGE for something, which is then worth a pass even if nothing changes (`runOnWake`).
 */
export const makeAdminSync = (request: EdgeRequest) => {
  /** Agent spaces EDGE confirmed are their agent's own, with this identity its admin. */
  const confirmed = new Set<SpaceId>();
  /** What this client has told EDGE of each agent space's members, by identity key. */
  const told = new Map<SpaceId, Map<string, Change>>();

  /** A space can claim to be any agent's: EDGE, which minted the agent's space, must name it. */
  const confirm = (space: AgentSpace.Space, did: IdentityDid): Effect.Effect<Answer> =>
    Effect.tryPromise({
      try: () => request(`/compute/brain/${encodeURIComponent(did)}`, { method: 'GET' }),
      catch: (cause) => new AdminSyncRequestError({ cause }),
    }).pipe(
      Effect.flatMap(Schema.decodeUnknownEffect(BrainInfo)),
      Effect.map(({ identity, role }): Answer =>
        identity.identityDid === did && identity.defaultSpaceId === space.id && role === 'admin' ? 'done' : 'refused',
      ),
      Effect.catch((error) => Effect.succeed(error instanceof AdminSyncRequestError ? answerTo(error) : 'refused')),
    );

  /** Tells EDGE of a change to the agent's admins; a change EDGE settled already counts as done. */
  const tell = (did: IdentityDid, identityKey: string, change: Change): Effect.Effect<Answer> =>
    Effect.tryPromise({
      try: () =>
        change === 'listed'
          ? request(`/compute/brain/${encodeURIComponent(did)}/admins`, { method: 'POST', body: { identityKey } })
          : request(`/compute/brain/${encodeURIComponent(did)}/admins/${identityKey}`, { method: 'DELETE' }),
      catch: (cause) => new AdminSyncRequestError({ cause }),
    }).pipe(
      Effect.as<Answer>('done'),
      Effect.catchIf(isSettled, () => Effect.succeed<Answer>('done')),
      Effect.catch((error) =>
        Effect.sync(() => {
          log.warn('agent admin change not taken by EDGE', { did, change, error });
          return answerTo(error);
        }),
      ),
    );

  return Effect.fnUntraced(function* (spaces: readonly AgentSpace.Space[], self: PublicKey) {
    let retry = false;
    for (const space of AgentSpace.administeredBy(spaces, self)) {
      const did = AgentSpace.agentOf(space)?.identity?.did;
      if (!IdentityDid.isValid(did)) {
        continue;
      }
      if (!confirmed.has(space.id)) {
        const answer = yield* confirm(space, did);
        retry ||= answer === 'unavailable';
        if (answer !== 'done') {
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
        if (!identityKey || toldSpace.get(identityKey) === change) {
          continue;
        }
        const answer = yield* tell(did, identityKey, change);
        retry ||= answer === 'unavailable';
        if (answer === 'done') {
          toldSpace.set(identityKey, change);
        }
      }
    }
    return retry;
  });
};

/**
 * Runs `pass` each time `wake` is offered to and, while the last pass could not reach EDGE for something, again after
 * `RETRY_DELAY` without a wake: a removal EDGE did not take must not wait for some other change to be told again.
 */
export const runOnWake = (wake: Queue.Dequeue<void>, pass: Effect.Effect<boolean>): Effect.Effect<never> =>
  Effect.gen(function* () {
    let retry = false;
    while (true) {
      const woken = Queue.take(wake);
      yield* retry ? woken.pipe(Effect.timeoutOption(RETRY_DELAY), Effect.asVoid) : woken;
      retry = yield* pass;
    }
  });

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
      runOnWake(
        wake,
        Effect.gen(function* () {
          for (const space of client.spaces.get()) {
            if (AgentSpace.isAgentSpace(space) && !watched.has(space.id)) {
              watched.set(space.id, space.members.subscribe(notify));
            }
          }
          const self = toPublicKey(client.halo.identity.get()?.identityKey);
          return self ? yield* sync(client.spaces.get(), self) : false;
        }),
      ),
    );
    notify();

    return [];
  }),
);
