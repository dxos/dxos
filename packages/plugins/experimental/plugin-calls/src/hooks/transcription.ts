//
// Copyright 2025 DXOS.org
//

import { signal, type ReadonlySignal } from '@preact/signals-core';

import { type DXN } from '@dxos/keys';
import { type TranscriptionState } from '@dxos/plugin-transcription/types';

import { type UserState } from '../types';

/**
 * Manages concurrency of transcription state.
 * The purpose is to have common consensus state for all users.
 * So protocol is to all peers share their local states
 * and merge them based on last write wins strategy.
 * We store only last state to avoid unnecessary memory usage.
 */
export class CallTranscription {
  private _state = signal<TranscriptionState>({
    lamportTimestamp: 0,
    enabled: false,
  });

  get state(): ReadonlySignal<TranscriptionState> {
    return this._state;
  }

  /**
   * Calculates CRDT from network states, we also need stable ids to sort states with same timestamps.
   * @see https://en.wikipedia.org/wiki/Lamport_timestamp
   */
  saveNetworkState(users: UserState[]) {
    const maxTimestamp = Math.max(...users.map((user) => user.transcription?.lamportTimestamp ?? 0));
    const newTranscriptionState = users
      .filter((user) => user.transcription && user.transcription.lamportTimestamp === maxTimestamp)
      .sort((user1, user2) => user1.id!.localeCompare(user2.id!));

    if (maxTimestamp > this._state.value.lamportTimestamp! && newTranscriptionState.length > 0) {
      this._state.value = newTranscriptionState[0].transcription || {};
    }
  }

  /**
   * Changes local state.
   */
  changeState(state: TranscriptionState) {
    this._state.value = {
      ...this._state.value,
      ...state,
      lamportTimestamp: (this._state.value.lamportTimestamp ?? 0) + 1,
    };
  }

  setEnabled(enabled: boolean) {
    this.changeState({ enabled });
  }

  setQueue(queue: DXN) {
    this.changeState({ queueDxn: queue.toString() });
  }
}
