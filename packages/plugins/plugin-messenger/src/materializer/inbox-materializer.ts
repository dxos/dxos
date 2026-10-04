//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';

import { type Client } from '@dxos/client';
import { type Space, SpaceState } from '@dxos/client/echo';
import { Database, Filter } from '@dxos/echo';
import { log } from '@dxos/log';
import { toPublicKey } from '@dxos/protocols/buf';
import { type Message } from '@dxos/types';

import { Notifications } from '#types';

import { type Sender, materialize } from './materialize.ts';

export type InboxMaterializer = {
  /** Runs a pass now, e.g. once something `getSpace` depends on has changed. */
  refresh: () => void;
  stop: () => void;
};

export type InboxMaterializerProps = {
  client: Client;
  /** The space notifications are stored in (the default space), or undefined while it is unknown. */
  getSpace: () => Space | undefined;
  /** Called with the space once it is ready, before each pass that writes to it. */
  onSpaceReady?: (space: Space) => void;
  /** Called for each message this device wrote; another device's copy arrives by replication and is not reported. */
  onWritten?: (message: Message.Message) => void;
};

/**
 * Keeps the notifications feed in step with the HALO inbox: every change to the pending messages,
 * the contact book, the space list or the set of notifications containers triggers a pass of {@link materialize}. Passes never overlap,
 * so one envelope is not written twice by this device.
 */
export const startInboxMaterializer = ({
  client,
  getSpace,
  onSpaceReady,
  onWritten,
}: InboxMaterializerProps): InboxMaterializer => {
  let closed = false;
  // Stopping interrupts a pass in flight, which would otherwise write to a client being torn down.
  const stopped = new AbortController();
  let running = false;
  let rerun = false;
  let watchedSpace: Space | undefined;
  let unwatchContainers = () => {};

  const pass = Effect.gen(function* () {
    const space = getSpace();
    if (!space) {
      return;
    }
    if (space.state.get() !== SpaceState.SPACE_READY) {
      void space.waitUntilReady().then(schedule);
      return;
    }

    onSpaceReady?.(space);
    // A container another device created arrives by replication alone, and must be folded in then.
    if (watchedSpace !== space) {
      unwatchContainers();
      watchedSpace = space;
      unwatchContainers = space.db.query(Filter.type(Notifications.Notifications)).subscribe(schedule);
    }
    const contacts = new Map(
      client.halo.contacts.get().flatMap((contact) => {
        const identityKey = toPublicKey(contact.identityKey);
        return identityKey && contact.did ? [[identityKey.toHex(), { did: contact.did }] as const] : [];
      }),
    ) satisfies ReadonlyMap<string, Sender>;
    const { written } = yield* materialize({
      messages: client.halo.inbox.messages.get(),
      contacts,
      ack: (ids) => client.halo.inbox.ack(ids),
    }).pipe(Effect.provide(Database.layer(space.db)));
    written.forEach((message) => onWritten?.(message));
  });

  const schedule = () => {
    if (closed) {
      return;
    }
    if (running) {
      rerun = true;
      return;
    }

    running = true;
    void Effect.runPromiseExit(
      pass.pipe(
        Effect.catch((error) => Effect.sync(() => log.warn('failed to materialize inbox messages', { error }))),
      ),
      { signal: stopped.signal },
    ).then((exit) => {
      running = false;
      if (rerun) {
        rerun = false;
        schedule();
      }
      // Only an interruption by `stop` is expected; a defect still surfaces as an unhandled rejection.
      if (Exit.isFailure(exit) && !Cause.hasInterruptsOnly(exit.cause)) {
        throw Cause.squash(exit.cause);
      }
    });
  };

  // `client.halo` is replaced when the services reconnect, so the subscriptions follow it.
  let unsubscribe = () => {};
  const watch = () => {
    unsubscribe();
    const subscriptions = [
      client.halo.inbox.messages.subscribe(schedule),
      client.halo.contacts.subscribe(schedule),
      client.spaces.subscribe(schedule),
    ];
    unsubscribe = () => subscriptions.forEach((subscription) => subscription.unsubscribe());
    schedule();
  };
  watch();
  const unsubscribeReloaded = client.reloaded.on(watch);

  return {
    refresh: schedule,
    stop: () => {
      closed = true;
      stopped.abort();
      unsubscribeReloaded();
      unsubscribe();
      unwatchContainers();
    },
  };
};
