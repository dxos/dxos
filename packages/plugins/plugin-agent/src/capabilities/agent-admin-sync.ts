//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Queue from 'effect/Queue';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import { Context } from '@dxos/context';
import { type EdgeHttpClient } from '@dxos/edge-client';
import { BaseError } from '@dxos/errors';
import { IdentityDid, type PublicKey, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { EdgeCallFailedError } from '@dxos/protocols';
import { toPublicKey } from '@dxos/protocols/buf';

import { AgentSpace } from '#types';

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
 * EDGE answers 404 where it has no admins route (an EDGE from before `IdentityAdmin`) or the caller has no role on the
 * agent: asking again this session would get the same answer.
 */
const isSettled = (error: AdminSyncRequestError): boolean =>
  error.cause instanceof EdgeCallFailedError && error.cause.status === 404;

/**
 * A 4xx is EDGE refusing, and asking again gets the same answer. No answer, or a 5xx, is EDGE or the network being down,
 * which EDGE's client does not always mark retryable, so status decides.
 */
const answerTo = (error: AdminSyncRequestError): Answer => {
  const status = error.cause instanceof EdgeCallFailedError ? error.cause.status : undefined;
  return status !== undefined && status >= 400 && status < 500 ? 'refused' : 'unavailable';
};

/**
 * Makes the members who may write to each agent's space, as this client sees it, the agent's admins on EDGE, which
 * issues each one an `IdentityAdmin` in the agent's HALO and checks the admin role against them. Admins are only
 * added: a member made a reader or removed keeps the role, since space membership has no revocation yet. Each add is
 * sent once a session; one EDGE did not take is sent again on the next pass, and EDGE appends no second credential for
 * an admin. A pass answers whether it could not reach EDGE for something, which is then worth a pass even if nothing
 * changes (`runOnWake`).
 */
export const makeAdminSync = (edge: Pick<EdgeHttpClient, 'getBrain' | 'addBrainAdmin'>) => {
  /** Agent spaces EDGE confirmed are their agent's own, with this identity its admin. */
  const confirmed = new Set<SpaceId>();
  /** The identity keys of each agent space's members EDGE took as the agent's admins this session. */
  const added = new Map<SpaceId, Set<string>>();

  /** A space can claim to be any agent's: EDGE, which minted the agent's space, must name it. */
  const confirm = (space: AgentSpace.Space, did: IdentityDid): Effect.Effect<Answer> =>
    Effect.tryPromise({
      try: () => edge.getBrain(Context.default(), did),
      catch: (cause) => new AdminSyncRequestError({ cause }),
    }).pipe(
      Effect.map(({ identity, role }): Answer =>
        identity.identityDid === did && identity.defaultSpaceId === space.id && role === 'admin' ? 'done' : 'refused',
      ),
      // An answer EDGE gave in a shape the client does not read would be the same next time.
      Effect.catch((error) => Effect.succeed(Schema.isSchemaError(error.cause) ? 'refused' : answerTo(error))),
    );

  /** Asks EDGE to make a member the agent's admin; an add EDGE settled already counts as done. */
  const add = (did: IdentityDid, identityKey: string): Effect.Effect<Answer> =>
    Effect.tryPromise({
      try: () => edge.addBrainAdmin(Context.default(), did, identityKey),
      catch: (cause) => new AdminSyncRequestError({ cause }),
    }).pipe(
      Effect.as<Answer>('done'),
      Effect.catchIf(isSettled, () => Effect.succeed<Answer>('done')),
      Effect.catch((error) =>
        Effect.sync(() => {
          log.warn('agent admin not added by EDGE', { did, error });
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

      const addedToSpace = added.get(space.id) ?? new Set<string>();
      added.set(space.id, addedToSpace);
      for (const member of AgentSpace.admins(space)) {
        const identityKey = toPublicKey(member.identity?.identityKey)?.toHex();
        if (!identityKey || addedToSpace.has(identityKey)) {
          continue;
        }
        const answer = yield* add(did, identityKey);
        retry ||= answer === 'unavailable';
        if (answer === 'done') {
          addedToSpace.add(identityKey);
        }
      }
    }
    return retry;
  });
};

/**
 * Runs `pass` each time `wake` is offered to and, while the last pass could not reach EDGE for something, again after
 * `RETRY_DELAY` without a wake: an add EDGE did not take must not wait for some other change to be sent again.
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

    let sync = makeAdminSync(edge.value);
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
    // The client replaces its space list when its services reconnect, so the subscriptions follow it. The services may
    // hold another identity by then, so what EDGE confirmed and took starts over.
    const unsubscribeReloaded = client.reloaded.on(() => {
      sync = makeAdminSync(edge.value);
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
