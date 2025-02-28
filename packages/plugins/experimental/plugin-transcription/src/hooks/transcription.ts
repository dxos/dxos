//
// Copyright 2025 DXOS.org
//

import { signal, type ReadonlySignal } from '@preact/signals-core';

import { type DXN } from '@dxos/keys';
import { type TranscriptionState } from '@dxos/plugin-transcription/types';

/**
 * Manages concurrency of transcription state.
 * @deprecated
 */
// TODO(burdon): Leaky abstraction; is this safe across the network?
export class CallTranscription {
  // TODO(burdon): Is this type part of the protocol?
  private _state = signal<TranscriptionState>({
    lamportTimestamp: 0,
    enabled: false,
  });

  get state(): ReadonlySignal<TranscriptionState> {
    return this._state;
  }

  setState(state: TranscriptionState) {
    this._state.value = {
      ...this._state.value,
      ...state,
      lamportTimestamp: (this._state.value.lamportTimestamp ?? 0) + 1,
    };
  }

  setEnabled(enabled: boolean) {
    this.setState({ enabled });
  }

  setQueue(queue: DXN) {
    this.setState({ queueDxn: queue.toString() });
  }
}
