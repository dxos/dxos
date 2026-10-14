//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { log } from '@dxos/log';

/** Asks whichever worker currently owns a storage lock to tear itself down and release it. */
const STOP_ACTION = 'stop';
/** Asks the tab owning that worker to terminate it, once it has ignored {@link STOP_ACTION}. */
const TERMINATE_ACTION = 'terminate';

/**
 * What an escalation tells the tab acting on it: who raised it, over which storage lock, and how
 * long the incumbent was given — the context the forced termination is reported with.
 */
const TerminateRequestSchema = Schema.Struct({
  issuerId: Schema.String,
  storageLockKey: Schema.String,
  graceTimeout: Schema.Number,
});

export type TerminateRequest = Schema.Schema.Type<typeof TerminateRequestSchema>;

const DisplaceMessageSchema = Schema.Union([
  Schema.Struct({ action: Schema.Literal(STOP_ACTION) }),
  Schema.Struct({ action: Schema.Literal(TERMINATE_ACTION), ...TerminateRequestSchema.fields }),
]);

type DisplaceMessage = Schema.Schema.Type<typeof DisplaceMessageSchema>;

const decodeDisplaceMessage = Schema.decodeUnknownOption(DisplaceMessageSchema);

/** Default displacement channel for a storage lock. */
export const displaceChannelFor = (storageLockKey: string): string => `${storageLockKey}/displace`;

/**
 * The displacement channel for one storage lock, expressed as actions rather than raw messages.
 *
 * Two levels ride on it. A starting worker posts `stop` so whichever worker owns the same storage
 * lock tears down and releases it; that is cooperative and needs the incumbent's event loop. When
 * the incumbent is wedged badly enough not to service this channel it never hears `stop`, so the
 * starting worker escalates with `terminate`, which is addressed at the *tab* holding the
 * incumbent's `Worker` handle — the only party that can free the lock without the worker's help.
 */
export class DisplaceChannel {
  readonly #channel: BroadcastChannel;

  /**
   * Called when another worker posts `stop`. Assignable because what a stop means to this worker
   * changes as it starts up — before the storage lock is granted there is nothing to stand down from.
   */
  onStop: () => void = () => {};

  /**
   * Called when a newer worker escalates. `issuerId` is that worker's id, so a tab can tell an
   * escalation raised against someone else from one raised by the worker it owns.
   */
  onTerminate: (request: TerminateRequest) => void = () => {};

  constructor(channelName: string) {
    this.#channel = new BroadcastChannel(channelName);
    this.#channel.onmessage = (event) => {
      // Decoded rather than trusted, because a `terminate` missing its issuer would otherwise be
      // dispatched and cost a worker its life.
      const message: DisplaceMessage | undefined = Option.getOrUndefined(decodeDisplaceMessage(event.data));
      if (!message) {
        log.warn('ignoring malformed displacement message', { channel: channelName, data: event.data });
        return;
      }
      switch (message.action) {
        case STOP_ACTION:
          this.onStop();
          break;
        case TERMINATE_ACTION: {
          const { issuerId, storageLockKey, graceTimeout } = message;
          this.onTerminate({ issuerId, storageLockKey, graceTimeout });
          break;
        }
      }
    };
  }

  postStop(): void {
    this.#channel.postMessage({ action: STOP_ACTION } satisfies DisplaceMessage);
  }

  postTerminate(request: TerminateRequest): void {
    this.#channel.postMessage({ action: TERMINATE_ACTION, ...request } satisfies DisplaceMessage);
  }

  close(): void {
    this.#channel.close();
  }
}
