//
// Copyright 2023 DXOS.org
//

import { type Context, createContext } from 'react';

import type { TimerCallback, TimerOptions } from '@dxos/async';
import { S } from '@dxos/echo-schema';

export type DebugContextType = {
  running: boolean;
  start: (cb: TimerCallback, options: TimerOptions) => void;
  stop: () => void;
};

export const DebugContext: Context<DebugContextType> = createContext<DebugContextType>({
  running: false,
  start: () => {},
  stop: () => {},
});

export const DebugSettingsSchema = S.mutable(
  S.Struct({
    devtools: S.optional(S.Boolean),
    debug: S.optional(S.Boolean),
    wireframe: S.optional(S.Boolean),
  }),
);

export interface DebugSettingsProps extends S.Schema.Type<typeof DebugSettingsSchema> {}
