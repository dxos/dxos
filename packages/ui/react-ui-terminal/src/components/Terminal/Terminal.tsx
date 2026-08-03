//
// Copyright 2026 DXOS.org
//

import '@xterm/xterm/css/xterm.css';

import type * as Command from '@effect/cli/Command';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal as Xterm } from '@xterm/xterm';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import type * as Layer from 'effect/Layer';
import React, { useEffect, useRef } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { XtermBridge, XtermContext, runShell } from '../../cli';
import { createXtermTheme } from './theme';

export type TerminalProps<Name extends string, R, E, A> = ThemedClassName<{
  /**
   * Root of an `@effect/cli` command tree; typically built with `Command.withSubcommands`.
   */
  command: Command.Command<Name, R, E, A>;
  /**
   * Services the command handlers need beyond the platform services provided internally, which is
   * why the terminal's own environment is excluded from what this must supply.
   */
  layer: Layer.Layer<Exclude<R, XtermContext.Provided>, any, never>;
  name?: string;
  version?: string;
  prompt?: string;
  banner?: string;
  fontSize?: number;
}>;

/**
 * Terminal emulator hosting an `@effect/cli` command tree entirely in the browser.
 *
 * The command tree and its layer are built once per mount, so state held by the services (a DXOS
 * client, for instance) persists across commands the way it does in a long-lived shell.
 */
export const Terminal = <Name extends string, R, E, A>({
  classNames,
  command,
  layer,
  name,
  version,
  prompt,
  banner,
  fontSize = 13,
}: TerminalProps<Name, R, E, A>) => {
  const containerRef = useRef<HTMLDivElement>(null);

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
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);
    xterm.open(container);

    // Fitting a zero-sized container pins the terminal to its one-column minimum, and fitting
    // before xterm's render service exists throws, so the observer's initial callback — which
    // lands once the element is measurable and the renderer is up — drives the first fit too.
    const fit = () => {
      if (container.clientWidth > 0 && container.clientHeight > 0) {
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

    const bridge = new XtermBridge(xterm);
    const shell = runShell(bridge, { command, name, version, prompt, banner }).pipe(
      Effect.provide(XtermContext.layer(bridge)),
      Effect.provide(layer),
    );
    const fiber = Effect.runFork(Effect.scoped(shell));

    const observer = new ResizeObserver(fit);
    observer.observe(container);

    return () => {
      cancelAnimationFrame(frame);
      themeObserver.disconnect();
      observer.disconnect();
      Effect.runFork(Fiber.interrupt(fiber));
      bridge.dispose();
      xterm.dispose();
    };
  }, [command, layer, name, version, prompt, banner, fontSize]);

  return <div ref={containerRef} className={mx('grow w-full h-full overflow-hidden bg-base-surface', classNames)} />;
};
