//
// Copyright 2026 DXOS.org
//

import { fromBinary, toBinary } from '@bufbuild/protobuf';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as EffectStream from 'effect/Stream';

import { Event, UpdateScheduler } from '@dxos/async';
import { Context } from '@dxos/context';
import { createDidFromIdentityKey, createSpaceInvitationNotice, verifySpaceInvitationNotice } from '@dxos/credentials';
import {
  type EdgeConnection,
  EdgeConnectionService,
  type EdgeHttpClient,
  EdgeHttpClientService,
} from '@dxos/edge-client';
import { EffectEx } from '@dxos/effect';
import { BaseError } from '@dxos/errors';
import { log } from '@dxos/log';
import { EdgeService, INBOX_NOTICE_TTL_MS, type InboxNotice, toServiceError } from '@dxos/protocols';
import { type Credential, CredentialSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { InboxService } from '@dxos/protocols/rpc';

import * as IdentityContract from '../../contracts/identity.ts';
import { type Identity } from '../../Identity.ts';

export class InboxUnavailableError extends BaseError.extend(
  'InboxUnavailableError',
  'The inbox needs an EDGE connection and an identity.',
) {}

/** The EDGE inbox endpoints the service calls; narrowed so tests can stand in for EDGE. */
export type InboxEdgeClient = Pick<EdgeHttpClient, 'sendInboxMessage' | 'listInbox' | 'ackInbox'>;

/** The identity the inbox signs as and receives for. */
export type InboxIdentitySource = {
  readonly stateUpdate: Event;
  readonly identity: Pick<Identity, 'identityKey' | 'getIdentityCredentialSigner'> | undefined;
};

/** The socket events that say the inbox may have changed. */
export type InboxPushSource = Pick<EdgeConnection, 'onMessage' | 'onReconnected'>;

export type InboxServiceOptions = {
  /** Catch-up poll while subscribed, in case a push frame was missed. */
  pollIntervalMs?: number;
};

const DEFAULT_POLL_INTERVAL_MS = 5 * 60 * 1_000;

type Entry = {
  notice: InboxService.Notice;
  /** Every EDGE entry carrying this notice; a resent credential lands under a fresh EDGE id. */
  edgeIds: Set<string>;
};

const encodeCredential = (credential: Credential): string =>
  Buffer.from(toBinary(CredentialSchema, credential)).toString('base64');

const decodeCredential = (payload: string): Credential | undefined => {
  try {
    return fromBinary(CredentialSchema, Buffer.from(payload, 'base64'));
  } catch {
    return undefined;
  }
};

/**
 * Space invitation notices relayed through the EDGE inbox.
 *
 * The pending set is pulled from EDGE when the first subscriber arrives, on every reconnect, on
 * every `inbox` push frame (which is treated as a doorbell, its payload unread) and on a slow poll;
 * each pull replaces the set, so an ack from another device drops the entry here too.
 */
export class InboxServiceImpl implements InboxService.Handlers {
  readonly #changed = new Event<InboxService.Notices>();
  #entries = new Map<string, Entry>();
  /** EDGE ids acked locally; a pull already in flight must not resurrect them. */
  readonly #acked = new Set<string>();
  #loaded = false;
  #subscribers = 0;
  #ctx?: Context;

  'constructor'(
    private readonly _identityManager: InboxIdentitySource,
    private readonly _edgeClient?: InboxEdgeClient,
    private readonly _pushSource?: InboxPushSource,
    private readonly _options: InboxServiceOptions = {},
  ) {}

  ['InboxService.send'](request: InboxService.SendRequest): Effect.Effect<void, Error> {
    return Effect.tryPromise({
      try: async () => {
        const identity = this._identityManager.identity;
        if (!identity || !this._edgeClient) {
          throw new InboxUnavailableError();
        }
        const credential = await createSpaceInvitationNotice(
          identity.getIdentityCredentialSigner(),
          request.recipientIdentityKey,
          { spaceKey: request.spaceKey, role: request.role },
        );
        const recipientDid = await createDidFromIdentityKey(request.recipientIdentityKey);
        await this._edgeClient.sendInboxMessage(Context.default(), recipientDid, encodeCredential(credential));
      },
      catch: toServiceError,
    });
  }

  ['InboxService.subscribe'](): EffectStream.Stream<InboxService.Notices, Error> {
    return EffectEx.streamFromEmitter<InboxService.Notices, Error>((emit) => {
      const unsubscribe = this.#changed.on((snapshot) => void emit.single(snapshot));
      if (this.#loaded || !this._edgeClient) {
        void emit.single(this.#snapshot());
      }
      this.#retain();
      return Effect.promise(async () => {
        unsubscribe();
        await this.#release();
      });
    });
  }

  ['InboxService.ack'](request: InboxService.AckRequest): Effect.Effect<void, Error> {
    return Effect.tryPromise({
      try: async () => {
        const edgeIds = request.ids.flatMap((id) => [...(this.#entries.get(id)?.edgeIds ?? [])]);
        if (edgeIds.length === 0) {
          return;
        }
        if (!this._edgeClient) {
          throw new InboxUnavailableError();
        }
        await this._edgeClient.ackInbox(Context.default(), edgeIds);
        edgeIds.forEach((id) => this.#acked.add(id));
        request.ids.forEach((id) => this.#entries.delete(id));
        this.#changed.emit(this.#snapshot());
      },
      catch: toServiceError,
    });
  }

  #snapshot(): InboxService.Notices {
    return {
      notices: [...this.#entries.values()]
        .map((entry) => entry.notice)
        .sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime()),
    };
  }

  #retain(): void {
    this.#subscribers++;
    if (this.#subscribers > 1 || !this._edgeClient) {
      return;
    }

    const ctx = new Context();
    const scheduler = new UpdateScheduler(ctx, () => this.#pull(ctx));
    this.#ctx = ctx;

    ctx.onDispose(this._identityManager.stateUpdate.on(() => scheduler.trigger()));
    if (this._pushSource) {
      ctx.onDispose(
        this._pushSource.onMessage((message) => {
          if (message.serviceId === EdgeService.INBOX) {
            scheduler.trigger();
          }
        }),
      );
      ctx.onDispose(this._pushSource.onReconnected(() => scheduler.trigger(), { emitCurrentState: false }));
    }
    const interval = setInterval(() => scheduler.trigger(), this._options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS);
    ctx.onDispose(() => clearInterval(interval));
    scheduler.trigger();
  }

  async #release(): Promise<void> {
    this.#subscribers--;
    if (this.#subscribers > 0) {
      return;
    }
    const ctx = this.#ctx;
    this.#ctx = undefined;
    await ctx?.dispose();
  }

  /** Replaces the pending set with EDGE's, keeping only notices that verify. Never throws. */
  async #pull(ctx: Context): Promise<void> {
    const edgeClient = this._edgeClient;
    const identity = this._identityManager.identity;
    if (!edgeClient) {
      return;
    }
    if (!identity) {
      this.#entries = new Map();
      this.#publish();
      return;
    }

    let notices: readonly InboxNotice[];
    try {
      ({ notices } = await edgeClient.listInbox(ctx));
    } catch (error) {
      // Offline or not yet authenticated: keep the last set and retry on the next trigger.
      log('inbox pull failed', { error });
      return;
    }

    const now = new Date();
    const entries = new Map<string, Entry>();
    const rejected: string[] = [];
    for (const edgeNotice of notices) {
      if (this.#acked.has(edgeNotice.id)) {
        continue;
      }
      const credential = decodeCredential(edgeNotice.payload);
      const result = credential
        ? await verifySpaceInvitationNotice(credential, {
            self: identity.identityKey,
            claimedSender: edgeNotice.senderDid,
            now,
            ttlMs: INBOX_NOTICE_TTL_MS,
          })
        : undefined;
      if (result?.kind !== 'pass') {
        log.warn('dropping inbox notice', { id: edgeNotice.id, reason: result?.reason ?? 'undecodable' });
        rejected.push(edgeNotice.id);
        continue;
      }

      const { notice } = result;
      const existing = entries.get(notice.id);
      if (existing) {
        existing.edgeIds.add(edgeNotice.id);
      } else {
        entries.set(notice.id, {
          notice: {
            id: notice.id,
            senderIdentityKey: notice.sender,
            spaceKey: notice.spaceKey,
            role: notice.role,
            sentAt: notice.sentAt,
          },
          edgeIds: new Set([edgeNotice.id]),
        });
      }
    }

    // Acked ids EDGE no longer returns have been deleted there; forget them.
    const listed = new Set(notices.map((edgeNotice) => edgeNotice.id));
    [...this.#acked].filter((id) => !listed.has(id)).forEach((id) => this.#acked.delete(id));

    this.#entries = entries;
    this.#publish();

    if (rejected.length > 0) {
      // A notice that fails verification can never become valid, so it is not left to use up the recipient's cap.
      await edgeClient.ackInbox(ctx, rejected).catch((error) => log('inbox ack of rejected notices failed', { error }));
    }
  }

  #publish(): void {
    this.#loaded = true;
    this.#changed.emit(this.#snapshot());
  }
}

export const InboxServiceLayer = Layer.effect(
  InboxService.Tag,
  Effect.gen(function* () {
    const identityManager = yield* IdentityContract.ManagerService;
    // Both are absent in the non-edge stack; the service then reports an empty inbox and refuses to send.
    const edgeClient = Option.getOrUndefined(yield* Effect.serviceOption(EdgeHttpClientService));
    const edgeConnection = Option.getOrUndefined(yield* Effect.serviceOption(EdgeConnectionService));
    return new InboxServiceImpl(identityManager, edgeClient, edgeConnection);
  }),
);
