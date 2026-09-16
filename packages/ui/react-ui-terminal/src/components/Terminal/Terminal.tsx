//
// Copyright 2026 DXOS.org
//

import '@xterm/xterm/css/xterm.css';

import { FitAddon } from '@xterm/addon-fit';
import { Terminal as Xterm } from '@xterm/xterm';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import type * as Layer from 'effect/Layer';
import type * as Command from 'effect/unstable/cli/Command';
import React, { type Ref, useEffect, useImperativeHandle, useRef } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { XtermBridge, XtermContext, runShell } from '../../cli/index.ts';
import { createXtermTheme } from './theme.ts';

/** Imperative surface for hosts that render controls beside the terminal (a clear button, e.g.). */
export type TerminalApi = {
  clear: () => void;
  focus: () => void;
};

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
  fontSize = 13,
  dimensions,
}: TerminalProps<Name, Input, ContextInput, E, R>) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // The instance is reached through a ref rather than published from the effect, so a host taking a
  // new ref object on re-render re-reads it without the terminal being torn down and rebuilt.
  const xtermRef = useRef<Xterm | null>(null);
  useImperativeHandle(
    ref,
    () => ({
      clear: () => xtermRef.current?.clear(),
      focus: () => xtermRef.current?.focus(),
    }),
    [],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    // The face must come from the mono token rather than the container, whose inherited UI face is
    // proportional and would leave xterm's fixed cells ragged.
    const styles = getComputedStyle(container);
    const xterm = new Xterm({
      fontSize,
      fontFamily: styles.getPropertyValue('--font-mono').trim() || 'monospace',
      cursorBlink: true,
      ...dimensions,
    });

    // Fixed-grid mode needs no fitting: the terminal is its own size and the host hugs it.
    const fitAddon = dimensions ? undefined : new FitAddon();
    if (fitAddon) {
      xterm.loadAddon(fitAddon);
    }
    xterm.open(container);

    // Fitting a zero-sized container pins the terminal to its one-column minimum, and fitting
    // before xterm's render service exists throws, so the observer's initial callback — which
    // lands once the element is measurable and the renderer is up — drives the first fit too.
    const fit = () => {
      if (fitAddon && container.clientWidth > 0 && container.clientHeight > 0) {
        fitAddon.fit();
      }
    };

    // Drive the palette from the design system tokens so the terminal tracks light/dark without a
    // scheme of its own. The theme class lands on the document from a provider whose effect runs
    // after this one, so the palette is applied on the next frame and refreshed on every change.
    const applyTheme = () => {
      xterm.options.theme = createXtermTheme(container);
    };

    const frame = requestAnimationFrame(applyTheme);
    const themeObserver = new MutationObserver(applyTheme);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });

    xterm.focus();
    xtermRef.current = xterm;

    const bridge = new XtermBridge(xterm);
    const shell = runShell(bridge, { command, name, version, prompt, banner }).pipe(
      Effect.provide(XtermContext.layer(bridge)),
      Effect.provide(layer),
    );
    const fiber = Effect.runFork(Effect.scoped(shell));

    const observer = new ResizeObserver(fit);
    observer.observe(container);

    return () => {
      xtermRef.current = null;
      cancelAnimationFrame(frame);
      themeObserver.disconnect();
      observer.disconnect();
      // Disposal is chained onto the interrupt rather than run beside it: the shell's finalizers
      // still write their last output through the bridge, which throws once xterm is gone.
      Effect.runFork(
        Fiber.interrupt(fiber).pipe(
          Effect.andThen(
            Effect.sync(() => {
              bridge.dispose();
              xterm.dispose();
            }),
          ),
        ),
      );
    };
  }, [command, layer, name, version, prompt, banner, fontSize, dimensions?.cols, dimensions?.rows]);

  return (
    <div
      className={mx('p-1 overflow-hidden', dimensions ? 'w-max h-max' : 'grow dx-fill', classNames)}
      ref={containerRef}
    />
  );
};
