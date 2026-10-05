//
// Copyright 2026 DXOS.org
//

import { create } from '@bufbuild/protobuf';

import { type Context } from '@dxos/context';
import { createDidFromIdentityKey } from '@dxos/credentials';
import { type MessageListener, type ReconnectListener } from '@dxos/edge-client';
import { EdgeCallFailedError, EdgeService, type InboxNotice } from '@dxos/protocols';
import { MessageSchema } from '@dxos/protocols/buf/dxos/edge/messenger_pb';

import {
  type InboxEdgeClient,
  type InboxIdentitySource,
  type InboxPushSource,
  type InboxRelay,
} from '../identity/index.ts';

type Device = { identity: InboxIdentitySource; listener: MessageListener };

/**
 * In-memory stand-in for the EDGE inbox: one pending list per recipient DID, with every connected
 * device of the recipient rung on each change, as the router's push frame would.
 * Share one between clients so they can message each other without EDGE.
 */
export class MemoryEdgeInbox implements InboxRelay {
  readonly notices = new Map<string, InboxNotice[]>();
  /** DIDs refused as EDGE refuses an identity not linked to an account. */
  readonly accountless = new Set<string>();
  readonly #devices = new Set<Device>();
  #nextId = 0;

  /** Stores a payload as EDGE would after authenticating `senderDid`. */
  put(recipientDid: string, senderDid: string, payload: string): string {
    const id = `n${++this.#nextId}`;
    const now = Date.now();
    this.#list(recipientDid).push({ id, senderDid, sentAt: now, expiresAt: now + 1_000_000, payload });
    void this.#ring(recipientDid);
    return id;
  }

  connect(identity: InboxIdentitySource): { edgeClient: InboxEdgeClient; pushSource: InboxPushSource } {
    // Resolved per call, since a client's identity is created after its services.
    const authenticate = async (): Promise<string> => {
      const identityKey = identity.identity?.identityKey;
      if (!identityKey) {
        throw new Error('Not authenticated: no identity.');
      }
      const did = await createDidFromIdentityKey(identityKey);
      if (this.accountless.has(did)) {
        throw new EdgeCallFailedError({
          message: 'Identity is not associated with an account.',
          data: { type: 'identity_not_associated_with_account' },
        });
      }
      return did;
    };

    const edgeClient: InboxEdgeClient = {
      sendInboxMessage: async (_ctx: Context, recipientDid: string, payload: string) => ({
        id: this.put(recipientDid, await authenticate(), payload),
      }),
      listInbox: async () => ({ notices: [...this.#list(await authenticate())] }),
      ackInbox: async (_ctx: Context, ids: readonly string[]) => {
        const did = await authenticate();
        this.notices.set(
          did,
          this.#list(did).filter((notice) => !ids.includes(notice.id)),
        );
        await this.#ring(did);
      },
    };
    const pushSource: InboxPushSource = {
      onMessage: (listener: MessageListener) => {
        const device = { identity, listener };
        this.#devices.add(device);
        return () => this.#devices.delete(device);
      },
      onReconnected: (_listener: ReconnectListener) => () => {},
    };
    return { edgeClient, pushSource };
  }

  #list(did: string): InboxNotice[] {
    const list = this.notices.get(did) ?? [];
    this.notices.set(did, list);
    return list;
  }

  async #ring(did: string): Promise<void> {
    const frame = create(MessageSchema, { serviceId: EdgeService.INBOX });
    for (const { identity, listener } of [...this.#devices]) {
      const identityKey = identity.identity?.identityKey;
      if (identityKey && (await createDidFromIdentityKey(identityKey)) === did) {
        listener(frame);
      }
    }
  }
}
