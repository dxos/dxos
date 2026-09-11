//
// Copyright 2024 DXOS.org
//

import { type JsonObject, type JsonValue } from '@bufbuild/protobuf';

import { DeferredTask, Event, sleep } from '@dxos/async';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type Messenger } from '@dxos/protocols';
import { unpackJson } from '@dxos/protocols/buf';
import { type GossipMessage } from '@dxos/protocols/buf/dxos/mesh/teleport/gossip_pb';

import {
  type AwarenessInfo,
  type AwarenessPosition,
  type AwarenessProvider,
  type AwarenessState,
} from './awareness.ts';

type ProtocolMessage =
  | {
      kind: 'query';
    }
  | {
      kind: 'post';
      state: AwarenessState;
    };

/**
 * The channel's protocol on the wire, where the envelope carries an opaque `Struct`.
 *
 * Written and read field by field: the payload is JSON of unknown provenance, so its shape is
 * established here rather than assumed of it.
 */
const toJson = (message: ProtocolMessage): JsonObject =>
  message.kind === 'query'
    ? { kind: 'query' }
    : {
        kind: 'post',
        state: {
          peerId: message.state.peerId,
          info: { ...message.state.info },
          ...(message.state.position ? { position: { ...message.state.position } } : {}),
        },
      };

const fromJson = (payload: JsonObject | undefined): ProtocolMessage | undefined => {
  if (payload?.kind === 'query') {
    return { kind: 'query' };
  }
  if (payload?.kind !== 'post') {
    return undefined;
  }

  const state = readObject(payload.state);
  const info = readObject(state?.info);
  const position = readObject(state?.position);
  if (typeof state?.peerId !== 'string' || !info) {
    return undefined;
  }

  return {
    kind: 'post',
    state: {
      peerId: state.peerId,
      info: {
        displayName: String(info.displayName ?? ''),
        darkColor: String(info.darkColor ?? ''),
        lightColor: String(info.lightColor ?? ''),
      },
      position: position && {
        anchor: typeof position.anchor === 'string' ? position.anchor : undefined,
        head: typeof position.head === 'string' ? position.head : undefined,
      },
    },
  };
};

const readObject = (value: JsonValue | undefined): JsonObject | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? value : undefined;

const DEBOUNCE_INTERVAL = 100; // ms

export type AwarenessProviderProps = {
  messenger: Messenger;
  channel: string;
  peerId: string;
  info: AwarenessInfo;
};

/**
 * Receives and broadcasts profile and cursor position.
 */
export class SpaceAwarenessProvider implements AwarenessProvider {
  private readonly _remoteStates = new Map<string, AwarenessState>();

  private readonly _messenger: Messenger;
  private readonly _channel: string;
  private readonly _peerId: string;
  private readonly _info: AwarenessInfo;

  private _ctx?: Context;
  private _postTask?: DeferredTask;
  private _localState?: AwarenessState;

  public readonly remoteStateChange = new Event<void>();

  constructor({ messenger, channel, peerId, info }: AwarenessProviderProps) {
    this._messenger = messenger;
    this._channel = channel;
    this._peerId = peerId;
    this._info = info;
  }

  open(): void {
    this._ctx = new Context();
    this._postTask = new DeferredTask(this._ctx, async () => {
      if (this._localState) {
        await this._messenger.postMessage(this._channel, toJson({ kind: 'post', state: this._localState }));

        // TODO(burdon): Replace with throttle.
        // TODO(burdon): Send heads?
        await sleep(DEBOUNCE_INTERVAL);
      }
    });

    this._ctx.onDispose(
      this._messenger.listen(this._channel, (message: GossipMessage) => {
        const payload = fromJson(unpackJson(message.payload));
        switch (payload?.kind) {
          case 'query': {
            this._handleQueryMessage();
            break;
          }
          case 'post': {
            this._handlePostMessage(payload);
            break;
          }
        }
      }),
    );

    void this._messenger.postMessage(this._channel, toJson({ kind: 'query' })).catch((err) => {
      log.debug('failed to query awareness', { err });
    });
  }

  close(): void {
    void this._ctx?.dispose();
    this._ctx = undefined;
    this._postTask = undefined;
  }

  getRemoteStates(): AwarenessState[] {
    return Array.from(this._remoteStates.values());
  }

  update(position: AwarenessPosition | undefined): void {
    this._localState = {
      peerId: this._peerId,
      position,
      info: this._info,
    };

    // Safe no-op if called before open() or during async teardown after close().
    this._postTask?.schedule();
  }

  private _handleQueryMessage(): void {
    this._postTask?.schedule();
  }

  private _handlePostMessage(message: ProtocolMessage): void {
    invariant(message.kind === 'post');
    // TODO(wittjosiah): Is it helpful or confusing to show cursors for self on other devices?
    this._remoteStates.set(message.state.peerId, message.state);
    this.remoteStateChange.emit();
  }
}
