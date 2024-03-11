//
// Copyright 2024 DXOS.org
//

import { DeferredTask, Event, sleep } from '@dxos/async';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type Space } from '@dxos/react-client/echo';
import { type GossipMessage } from '@dxos/react-client/mesh';

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

export type AwarenessProviderParams = {
  space: Space;
  channel: string;
  peerId: string;
  info: AwarenessInfo;
};

/**
 * Receives and broadcasts profile and cursor position.
 */
export class SpaceAwarenessProvider implements AwarenessProvider {
  private readonly _remoteStates = new Map<string, AwarenessState>();

  private readonly _space: Space;
  private readonly _channel: string;
  private readonly _peerId: string;
  private readonly _info: AwarenessInfo;

  private _ctx?: Context;
  private _postTask?: DeferredTask;
  private _localState?: AwarenessState;

  public readonly remoteStateChange = new Event<void>();

  constructor(params: AwarenessProviderParams) {
    this._space = params.space;
    this._channel = params.channel;
    this._peerId = params.peerId;
    this._info = params.info;
  }

  open() {
    this._ctx = new Context();
    this._postTask = new DeferredTask(this._ctx, async () => {
      if (this._localState) {
        await this._space.postMessage(this._channel, {
          kind: 'post',
          state: this._localState,
        } satisfies ProtocolMessage);

        await sleep(DEBOUNCE_INTERVAL);
      }
    });

    this._ctx.onDispose(
      this._space.listen(this._channel, (message: GossipMessage) => {
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

    void this._space
      .postMessage(this._channel, {
        kind: 'query',
      } satisfies ProtocolMessage)
      .catch((err) => {
        log.debug('failed to query awareness', { err });
      });
  }

  close() {
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

  private _handleQueryMessage() {
    invariant(this._postTask);
    this._postTask.schedule();
  }

  private _handlePostMessage(message: ProtocolMessage) {
    invariant(message.kind === 'post');
    this._remoteStates.set(message.state.peerId, message.state);
    this.remoteStateChange.emit();
  }
}
