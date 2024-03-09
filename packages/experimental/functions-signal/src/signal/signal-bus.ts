//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';
import * as Either from 'effect/Either';

import { type Space } from '@dxos/client/echo';
import { log } from '@dxos/log';

export const Signal = S.struct({
  id: S.string,
  kind: S.literal('echo-mutation', 'timer', 'attention', 'suggestion'),
  metadata: S.struct({
    createdMs: S.number,
    source: S.string,
    triggerSignalId: S.optional(S.string),
    spaceKey: S.optional(S.string),
  }),
  data: S.struct({
    type: S.string.pipe(S.description('Value schema name')),
    value: S.any,
  }),
});
export type Signal = S.Schema.From<typeof Signal>;

export type OnSignalCallback = (signal: Signal) => void;

export class SignalBus {
  private readonly callbacks: OnSignalCallback[] = [];

  public constructor(private readonly space: Space) {}

  emit(signal: Signal) {
    this.space.postMessage('signals', signal).catch((error) => {
      log.warn('failed to emit a signal', { signal, error });
    });
    this.emitLocal(signal);
  }

  emitLocal(signal: Signal) {
    for (const callback of this.callbacks) {
      callback(signal);
    }
  }

  subscribe(callback: (signal: Signal) => void): () => void {
    if (this.callbacks.includes(callback)) {
      throw new Error('double registration of a callback');
    }
    const unsubscribe = this.space.listen('signals', (message) => {
      const decoded = S.decodeEither<Signal, Signal>(Signal)(message.payload);
      if (Either.isRight(decoded)) {
        callback(decoded.right);
      } else {
        log.warn('malformed signal received', { error: decoded.left });
      }
    });
    this.callbacks.push(callback);
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index >= 0) {
        this.callbacks.splice(index, 1);
      }
      unsubscribe();
    };
  }
}
