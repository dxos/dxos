//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';
import * as Either from 'effect/Either';

import { type Space } from '@dxos/client/echo';

import { type Signal, type SignalBus, SignalBusInterconnect } from '../signal';

type UnsubscribeFn = () => void;

export class Effector {
  public static forSignalSchema<T>(
    space: Space,
    schema: S.Schema<T>,
    onSignal: (ctx: EffectorContext, signal: T) => void,
  ): UnsubscribeFn {
    const bus = SignalBusInterconnect.global.createConnected(space);
    const effectorCtx = { bus };
    const validator = S.validateEither(schema);
    return bus.subscribe((signal: Signal) => {
      const validation = validator(signal);
      if (Either.isRight(validation)) {
        onSignal(effectorCtx, validation.right);
      }
    });
  }
}

export interface EffectorContext {
  bus: SignalBus;
}
