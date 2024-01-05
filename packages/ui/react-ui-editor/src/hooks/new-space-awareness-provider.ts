//
// Copyright 2024 DXOS.org
//

import { DeferredTask, Event, sleep } from '@dxos/async';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { type Space } from '@dxos/react-client/echo';
import { type GossipMessage } from '@dxos/react-client/src/mesh';

import {
  type AwarenessPosition,
  type AwarenessProvider,
  type AwarenessState,
} from '../components/TextEditor/extensions/awareness';

export type NewSpaceAwarenessProviderParams = {
  space: Space;
  channel: string;
  peerId: string;
  displayName: string;
  color: string;
};

type ProtocolMessage =
  | {
      kind: 'query';
    }
  | {
      kind: 'post';
      state: AwarenessState;
    };

export class NewSpaceAwarenessProvider implements AwarenessProvider {
  private readonly _space: Space;
  private readonly _channel: string;
  private readonly _peerId: string;
  private readonly _displayName: string;
  private readonly _color: string;
  public readonly remoteStateChange = new Event<void>();

  private _remoteStates = new Map<string, AwarenessState>();
  private _localState?: AwarenessState = undefined;

  private readonly _ctx = new Context();
  private readonly _postTask = new DeferredTask(this._ctx, async () => {
    if (this._localState) {
      this._space.postMessage(this._channel, {
        kind: 'post',
        state: this._localState,
      } satisfies ProtocolMessage);

      await sleep(100); // TODO(dmaretskyi): config.
    }
  });

  constructor(params: NewSpaceAwarenessProviderParams) {
    this._space = params.space;
    this._channel = params.channel;
    this._peerId = params.peerId;
    this._displayName = params.displayName;
    this._color = params.color;
  }

  open() {
    const unsubscribe = this._space.listen(this._channel, (message: GossipMessage) => {
      console.log(message);
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

    this._space.postMessage(this._channel, {
      kind: 'query',
    } satisfies ProtocolMessage);
  }

  close() {
    this._ctx.dispose();
  }

  localPositionChanged(position: AwarenessPosition | null): void {
    this._localState = {
      peerId: this._peerId,
      displayName: this._displayName,
      color: this._color,
      position: position ?? undefined,
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
