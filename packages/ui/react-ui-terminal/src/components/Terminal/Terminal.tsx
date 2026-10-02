//
// Copyright 2026 DXOS.org
//

import type * as Command from 'effect/cli/Command';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import type * as Layer from 'effect/Layer';
import React, { type Ref, useCallback } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';

import { XtermBridge, XtermContext, runShell } from '../../cli/index.ts';
import { type TerminalApi, type XtermAttach, XtermView } from '../XtermView/index.ts';

export type TerminalProps<Name extends string, Input, ContextInput, E, R> = ThemedClassName<{
  /** Publishes the {@link TerminalApi} while mounted. */
  ref?: Ref<TerminalApi>;
  /**
   * Root of an Effect CLI command tree; typically built with `Command.withSubcommands`.
   */
  command: Command.Command<Name, Input, ContextInput, E, R>;
  /**
   * Services the command handlers need beyond the platform services provided internally, which is
   * why the terminal's own environment is excluded from what this must supply.
   *
   * Construction must not fail: the shell runs on a forked fiber with no surface to report a layer
   * error on, so a host that can fail to build its services has to resolve that before mounting.
   */
  layer: Layer.Layer<Exclude<R, XtermContext.Provided>, never, never>;
  name?: string;
  version?: string;
  prompt?: string;
  banner?: string;
  fontSize?: number;
  /**
   * Fixed cell grid. With this the terminal renders exactly `cols × rows` and the element hugs the
   * grid, so a host sized by its content (a popover) shows no rounding slack; without it the
   * terminal fits itself to the container, whose trailing partial cells read as a gap.
   */
  dimensions?: { cols: number; rows: number };
}>;

/**
 * Terminal emulator hosting an Effect CLI command tree entirely in the browser.
 *
 * The command tree and its layer are built once per mount, so state held by the services (a DXOS
 * client, for instance) persists across commands the way it does in a long-lived shell.
 */
export const Terminal = <Name extends string, Input, ContextInput, E, R>({
  ref,
  classNames,
  command,
  layer,
  name,
  version,
  prompt,
  banner,
  fontSize,
  dimensions,
}: TerminalProps<Name, Input, ContextInput, E, R>) => {
  const attach = useCallback<XtermAttach>(
    (xterm) => {
      const bridge = new XtermBridge(xterm);
      const shell = runShell(bridge, { command, name, version, prompt, banner }).pipe(
        // `R` is generic here, so the checker can discharge `Exclude<R, XtermContext.Provided>` only
        // one provide at a time; any combined form leaves the requirement unsolved.
        // @effect-diagnostics-next-line multipleEffectProvide:off
        Effect.provide(XtermContext.layer(bridge)),
        Effect.provide(layer),
      );
      const fiber = Effect.runFork(Effect.scoped(shell));

      // The bridge is disposed only after the interrupt: the shell's finalizers still write their
      // last output through it, and the view disposes xterm once this settles.
      return () => Effect.runPromise(Fiber.interrupt(fiber).pipe(Effect.andThen(Effect.sync(() => bridge.dispose()))));
    },
    [command, layer, name, version, prompt, banner],
  );

  return <XtermView ref={ref} classNames={classNames} attach={attach} fontSize={fontSize} dimensions={dimensions} />;
};
