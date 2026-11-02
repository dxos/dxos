//
// Copyright 2026 DXOS.org
//

import type * as Effect from 'effect/Effect';

import { App, render } from '../../../components/index.ts';
import { theme } from '../../../theme.ts';
import { type LogBuffer } from '../../../util/index.ts';
import { Trace, type TraceProps } from './components/Trace.tsx';

export type TraceAppOptions = TraceProps & {
  logBuffer: LogBuffer;
  onDestroy?: () => void;
};

/** Renders the invocation trace TUI until the user exits. */
export const renderTraceApp = ({ logBuffer, onDestroy, ...trace }: TraceAppOptions): Effect.Effect<void> =>
  render({
    app: () => (
      // TODO(wittjosiah): Rather than pass db and feedService probably should have some sort of context provider then introduce hooks for interacting with the db and feeds.
      <App focusElements={['table']} logBuffer={logBuffer} theme={theme}>
        <Trace {...trace} />
      </App>
    ),
    focusElements: ['table'],
    logBuffer,
    theme,
    onDestroy,
  });
