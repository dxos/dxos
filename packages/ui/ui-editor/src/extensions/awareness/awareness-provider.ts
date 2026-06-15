//
// Copyright 2024 DXOS.org
//

import { DeferredTask, Event, sleep } from '@dxos/async';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type Messenger } from '@dxos/protocols';
import { type GossipMessage } from '@dxos/protocols/proto/dxos/mesh/teleport/gossip';

import { type AwarenessInfo, type AwarenessPosition, type AwarenessProvider, type AwarenessState } from './awareness';

type ProtocolMessage =
  | {
      kind: 'query';
    }
  | {
      kind: 'post';
      state: AwarenessState;
    };

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
        await this._messenger.postMessage(this._channel, {
          kind: 'post',
          state: this._localState,
        } satisfies ProtocolMessage);

        // TODO(burdon): Replace with throttle.
        // TODO(burdon): Send heads?
        await sleep(DEBOUNCE_INTERVAL);
      }
    });

    this._ctx.onDispose(
      this._messenger.listen(this._channel, (message: GossipMessage) => {
        switch (message.payload.kind) {
          case 'query': {
            this._handleQueryMessage();
            break;
          }
          case 'post': {
            this._handlePostMessage(message.payload);
            break;
          }
        }
      }),
    );

    void this._messenger
      .postMessage(this._channel, {
        kind: 'query',
      } satisfies ProtocolMessage)
      .catch((err) => {
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
    invariant(this._postTask);
    this._localState = {
      peerId: this._peerId,
      position,
      info: this._info,
    };

    this._postTask.schedule();
  }

  private _handleQueryMessage(): void {
    invariant(this._postTask);
    this._postTask.schedule();
  }

  private _handlePostMessage(message: ProtocolMessage): void {
    invariant(message.kind === 'post');
    // TODO(wittjosiah): Is it helpful or confusing to show cursors for self on other devices?
    this._remoteStates.set(message.state.peerId, message.state);
    this.remoteStateChange.emit();
  }
}
