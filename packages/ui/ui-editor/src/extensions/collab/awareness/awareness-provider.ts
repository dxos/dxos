//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Event } from '@dxos/async';
import { type Messenger } from '@dxos/protocols';
import * as Awareness from '@dxos/protocols/Awareness';

import {
  type AwarenessInfo,
  type AwarenessPosition,
  type AwarenessProvider,
  type AwarenessState,
  type AwarenessUpdateOptions,
} from './awareness.ts';

/** A caret as automerge cursors, the editor's own coordinates. */
const Position = Schema.Struct({
  anchor: Schema.optional(Schema.String),
  head: Schema.optional(Schema.String),
});

/** An empty cursor stands for a document the sender could not resolve, so it draws nothing. */
const hasCaret = ({ value }: Awareness.RemoteSession<AwarenessPosition>): boolean => !!value?.anchor && !!value?.head;

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
  public readonly remoteStateChange = new Event<void>();

  private readonly _channel: Awareness.Channel<AwarenessPosition>;
  private _unsubscribe?: () => void;
  /** Re-announcements repeat unchanged state; only a change to what is shown needs the editors to redraw. */
  private _shown = '[]';

  constructor({ messenger, channel, peerId, info }: AwarenessProviderProps) {
    this._channel = new Awareness.Channel({ messenger, channel, peer: { peerId, info }, schema: Position });
  }

  open(): void {
    this._unsubscribe = this._channel.changed.on(() => {
      const shown = JSON.stringify(this.getRemoteStates());
      if (shown !== this._shown) {
        this._shown = shown;
        this.remoteStateChange.emit();
      }
    });
    this._channel.open();
  }

  close(): void {
    this._channel.close();
    this._unsubscribe?.();
    this._unsubscribe = undefined;
    this._shown = '[]';
  }

  /** One state per identity: its most recently changed session with a caret, else its most recent. */
  getRemoteStates(): AwarenessState[] {
    // TODO(wittjosiah): Is it helpful or confusing to show cursors for self on other devices?
    return Awareness.latestPerPeer(this._channel.getSessions(), { prefer: hasCaret }).map(
      ({ peerId, info, value }) => ({ peerId, info, ...(value ? { position: value } : {}) }),
    );
  }

  update(position: AwarenessPosition | undefined, options?: AwarenessUpdateOptions): void {
    // A cursor can stay put while the user types (it names the character after the caret), so recency
    // follows what the user did, not whether the cursor changed.
    this._channel.update(position, options);
  }
}
