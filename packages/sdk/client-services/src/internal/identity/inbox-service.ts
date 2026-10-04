//
// Copyright 2026 DXOS.org
//

import { fromBinary } from '@bufbuild/protobuf';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as EffectStream from 'effect/Stream';

import { Event, UpdateScheduler } from '@dxos/async';
import { Context } from '@dxos/context';
import {
  INBOX_ENVELOPE_TTL_MS,
  INBOX_ENVELOPE_VERSION,
  SPACE_INVITATION_NOTICE_TTL_MS,
  type VerifiedSpaceInvitationNotice,
  createDidFromIdentityKey,
  createInboxEnvelope,
  decodeInboxEnvelope,
  encodeInboxEnvelope,
  verifyInboxEnvelope,
  verifySpaceInvitationNotice,
} from '@dxos/credentials';
import {
  type EdgeConnection,
  EdgeConnectionService,
  type EdgeHttpClient,
  EdgeHttpClientService,
} from '@dxos/edge-client';
import { EffectEx } from '@dxos/effect';
import { BaseError } from '@dxos/errors';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import {
  EdgeService,
  INBOX_MAX_PAYLOAD_LENGTH,
  type InboxNotice,
  InboxPayloadTooLargeError,
  toServiceError,
} from '@dxos/protocols';
import { type Credential, CredentialSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { InboxService } from '@dxos/protocols/rpc';
import { Message, SpaceInvitationMessage } from '@dxos/types';

import * as IdentityContract from '../../contracts/identity.ts';
import { type Identity } from '../../Identity.ts';

export class InboxUnavailableError extends BaseError.extend(
  'InboxUnavailableError',
  'The inbox is not available until the identity is ready and connected.',
) {}

/** The EDGE inbox endpoints the service calls; narrowed so tests can stand in for EDGE. */
export type InboxEdgeClient = Pick<EdgeHttpClient, 'sendInboxMessage' | 'listInbox' | 'ackInbox'>;

/** The identity the inbox signs as and receives for. */
export type InboxIdentitySource = {
  readonly stateUpdate: Event;
  readonly identity: Pick<Identity, 'identityKey' | 'getInboxEnvelopeSigner'> | undefined;
};

/** The socket events that say the inbox may have changed. */
export type InboxPushSource = Pick<EdgeConnection, 'onMessage' | 'onReconnected'>;

/**
 * Stands in for the EDGE inbox, authenticating each call as whichever identity `identity` holds at
 * the time; tests share one between clients so they can message each other without EDGE.
 */
export interface InboxRelay {
  connect(identity: InboxIdentitySource): { edgeClient: InboxEdgeClient; pushSource: InboxPushSource };
}

export type InboxServiceOptions = {
  /** Catch-up poll while subscribed, in case a push frame was missed. */
  pollIntervalMs?: number;
};

const DEFAULT_POLL_INTERVAL_MS = 5 * 60 * 1_000;

/** Payload types this client surfaces; envelopes of any other type stay pending for a newer client. */
const KNOWN_TYPES = new Set<string>([InboxService.INBOX_MESSAGE_TYPE]);

type Entry = {
  message: InboxService.InboxMessage;
  /** Every EDGE entry carrying this message; a resent envelope lands under a fresh EDGE id. */
  edgeIds: Set<string>;
};

/** What one EDGE entry turned out to be. */
type Classified =
  | { kind: 'message'; message: InboxService.InboxMessage }
  /** Possibly valid for a newer client: neither surfaced nor acked. */
  | { kind: 'pending' }
  /** Can never become valid, so it is acked rather than left to use up the recipient's cap. */
  | { kind: 'rejected'; reason: string };

const decodeCredential = (payload: string): Credential | undefined => {
  try {
    return fromBinary(CredentialSchema, Buffer.from(payload, 'base64'));
  } catch {
    return undefined;
  }
};

/**
 * Converts a legacy (pre-envelope) invitation notice into the message a current sender would build.
 * Receive-only: delete once the notice TTL has passed for every sender on a pre-envelope release.
 */
const legacyInvitationMessage = async (notice: VerifiedSpaceInvitationNotice): Promise<InboxService.InboxMessage> => ({
  id: notice.id,
  senderIdentityKey: notice.sender,
  type: InboxService.INBOX_MESSAGE_TYPE,
  payload: Message.encodeJson(
    SpaceInvitationMessage.make({
      sender: { identityDid: await createDidFromIdentityKey(notice.sender) },
      spaceKey: notice.spaceKey.toHex(),
      role: notice.role,
      created: notice.sentAt,
    }),
  ),
  sentAt: notice.sentAt,
});

/**
 * User-to-user messages relayed through the EDGE inbox, each carried in a signed envelope.
 *
 * The pending set is pulled from EDGE when the first subscriber arrives, on every reconnect, on
 * every `inbox` push frame (which is treated as a doorbell, its payload unread) and on a slow poll;
 * each pull replaces the set, so an ack from another device drops the entry here too.
 */
export class InboxServiceImpl implements InboxService.Handlers {
  readonly #changed = new Event<InboxService.Messages>();
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

  ['InboxService.sendMessage'](request: InboxService.SendMessageRequest): Effect.Effect<void, Error> {
    return Effect.tryPromise({
      try: async () => {
        const identity = this._identityManager.identity;
        if (!identity || !this._edgeClient) {
          throw new InboxUnavailableError();
        }
        const envelope = await createInboxEnvelope(identity.getInboxEnvelopeSigner(), request.recipientIdentityKey, {
          type: request.type,
          payload: request.payload,
        });
        const payload = Buffer.from(encodeInboxEnvelope(envelope)).toString('base64');
        if (payload.length > INBOX_MAX_PAYLOAD_LENGTH) {
          throw new InboxPayloadTooLargeError({
            context: { length: payload.length, maxLength: INBOX_MAX_PAYLOAD_LENGTH },
          });
        }
        const recipientDid = await createDidFromIdentityKey(request.recipientIdentityKey);
        await this._edgeClient.sendInboxMessage(Context.default(), recipientDid, payload);
      },
      catch: toServiceError,
    });
  }

  ['InboxService.subscribe'](): EffectStream.Stream<InboxService.Messages, Error> {
    return EffectEx.streamFromEmitter<InboxService.Messages, Error>((emit) => {
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

  #snapshot(): InboxService.Messages {
    return {
      messages: [...this.#entries.values()]
        .map((entry) => entry.message)
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

  /** Replaces the pending set with EDGE's, keeping only messages that verify. Never throws. */
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
      const result = await this.#classify(identity.identityKey, edgeNotice, now);
      if (result.kind === 'rejected') {
        log.warn('dropping inbox message', { id: edgeNotice.id, reason: result.reason });
        rejected.push(edgeNotice.id);
        continue;
      }
      if (result.kind === 'pending') {
        continue;
      }

      const { message } = result;
      const existing = entries.get(message.id);
      if (existing) {
        existing.edgeIds.add(edgeNotice.id);
      } else {
        // Keeps the previous pull's copy, since a converted legacy notice is rebuilt with a fresh object id.
        entries.set(message.id, {
          message: this.#entries.get(message.id)?.message ?? message,
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
      await edgeClient
        .ackInbox(ctx, rejected)
        .catch((error) => log('inbox ack of rejected messages failed', { error }));
    }
  }

  /**
   * Decodes an EDGE entry as an envelope first, then as a legacy invitation credential.
   */
  async #classify(self: PublicKey, edgeNotice: InboxNotice, now: Date): Promise<Classified> {
    const bytes = Buffer.from(edgeNotice.payload, 'base64');
    const envelope = decodeInboxEnvelope(bytes);
    if (envelope) {
      if (envelope.version !== INBOX_ENVELOPE_VERSION) {
        return { kind: 'pending' };
      }
      const result = await verifyInboxEnvelope(envelope, {
        self,
        claimedSender: edgeNotice.senderDid,
        now,
        ttlMs: INBOX_ENVELOPE_TTL_MS,
      });
      if (result.kind === 'fail') {
        return { kind: 'rejected', reason: result.reason };
      }
      const { id, type, sender, payload, sentAt } = result.envelope;
      if (!KNOWN_TYPES.has(type)) {
        return { kind: 'pending' };
      }
      return { kind: 'message', message: { id, senderIdentityKey: sender, type, payload, sentAt } };
    }

    const credential = decodeCredential(edgeNotice.payload);
    if (!credential) {
      return { kind: 'rejected', reason: 'undecodable' };
    }
    const result = await verifySpaceInvitationNotice(credential, {
      self,
      claimedSender: edgeNotice.senderDid,
      now,
      ttlMs: SPACE_INVITATION_NOTICE_TTL_MS,
    });
    if (result.kind === 'fail') {
      return { kind: 'rejected', reason: result.reason };
    }
    return { kind: 'message', message: await legacyInvitationMessage(result.notice) };
  }

  #publish(): void {
    this.#loaded = true;
    this.#changed.emit(this.#snapshot());
  }
}

export type InboxServiceLayerOptions = {
  /** Replaces EDGE, so the inbox works in tests without it. */
  relay?: InboxRelay;
};

export const InboxServiceLayer = ({ relay }: InboxServiceLayerOptions = {}) =>
  Layer.effect(
    InboxService.Tag,
    Effect.gen(function* () {
      const identityManager = yield* IdentityContract.ManagerService;
      if (relay) {
        const { edgeClient, pushSource } = relay.connect(identityManager);
        return new InboxServiceImpl(identityManager, edgeClient, pushSource);
      }
      // Both are absent in the non-edge stack; the service then reports an empty inbox and refuses to send.
      const edgeClient = Option.getOrUndefined(yield* Effect.serviceOption(EdgeHttpClientService));
      const edgeConnection = Option.getOrUndefined(yield* Effect.serviceOption(EdgeConnectionService));
      return new InboxServiceImpl(identityManager, edgeClient, edgeConnection);
    }),
  );
