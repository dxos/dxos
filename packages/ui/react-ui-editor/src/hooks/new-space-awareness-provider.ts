//
// Copyright 2024 DXOS.org
//

import { DeferredTask, Event, sleep } from '@dxos/async';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type Space } from '@dxos/react-client/echo';
import { type GossipMessage } from '@dxos/react-client/mesh';

import {
  type AwarenessInfo,
  type AwarenessPosition,
  type AwarenessProvider,
  type AwarenessState,
} from '../extensions';

export type NewSpaceAwarenessProviderParams = {
  space: Space;
  channel: string;
  peerId: string;
  info: AwarenessInfo;
};

type ProtocolMessage =
  | {
      kind: 'query';
    }
  | {
      kind: 'post';
      state: AwarenessState;
    };

const DEBOUNCE_INTERVAL = 100; // ms

export class NewSpaceAwarenessProvider implements AwarenessProvider {
  private readonly _space: Space;
  private readonly _channel: string;
  private readonly _peerId: string;
  private readonly _info: AwarenessInfo;
  private _remoteStates = new Map<string, AwarenessState>();
  private _localState?: AwarenessState = undefined;

  private _ctx!: Context;
  private _postTask!: DeferredTask;

  public readonly remoteStateChange = new Event<void>();

  constructor(params: NewSpaceAwarenessProviderParams) {
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

    const unsubscribe = this._space.listen(this._channel, (message: GossipMessage) => {
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
    });
    this._ctx.onDispose(unsubscribe);

    void this._space
      .postMessage(this._channel, {
        kind: 'query',
      } satisfies ProtocolMessage)
      .catch((err) => {
        log.debug('failed to query awareness', { err });
      });
  }

  close() {
    void this._ctx.dispose();
  }

  updateLocalPosition(position: AwarenessPosition | undefined): void {
    this._localState = {
      peerId: this._peerId,
      position,
      info: this._info,
    };

    this._postTask.schedule();
  }

  getRemoteStates(): AwarenessState[] {
    return Array.from(this._remoteStates.values());
  }

  private _handleQueryMessage() {
    this._postTask.schedule();
  }

  private _handlePostMessage(message: ProtocolMessage) {
    invariant(message.kind === 'post');
    this._remoteStates.set(message.state.peerId, message.state);
    this.remoteStateChange.emit();
  }
}
