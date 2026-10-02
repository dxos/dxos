//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import React, { type Ref, useCallback } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';

import { type TerminalBridge, XtermBridge, runRepl } from '../../cli/index.ts';
import { type TerminalApi, type XtermAttach, XtermView } from '../XtermView/index.ts';

export type LineTerminalProps = ThemedClassName<{
  /** Publishes the {@link TerminalApi} while mounted. */
  ref?: Ref<TerminalApi>;
  /**
   * Runs one entered line, writing its response through `bridge`. A failure must be written rather
   * than raised: the prompt returns only once this succeeds. Memoize it; a new one restarts the session.
   */
  evaluate: (line: string, bridge: TerminalBridge) => Effect.Effect<void>;
  prompt?: string;
  banner?: string;
  fontSize?: number;
}>;

/**
 * A line-at-a-time terminal: the CLI terminal's line editor, history and prompt, handing each line
 * to `evaluate` rather than to an Effect CLI command tree.
 */
export const LineTerminal = ({ ref, classNames, evaluate, prompt = '$ ', banner, fontSize }: LineTerminalProps) => {
  const attach = useCallback<XtermAttach>(
    (xterm) => {
      const bridge = new XtermBridge(xterm);
      const fiber = Effect.runFork(runRepl(bridge, { prompt, banner, evaluate: (line) => evaluate(line, bridge) }));
      return () => Effect.runPromise(Fiber.interrupt(fiber).pipe(Effect.andThen(Effect.sync(() => bridge.dispose()))));
    },
    [evaluate, prompt, banner],
  );

  return <XtermView ref={ref} classNames={classNames} attach={attach} fontSize={fontSize} />;
};
