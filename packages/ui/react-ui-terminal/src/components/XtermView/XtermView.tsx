//
// Copyright 2026 DXOS.org
//

import '@xterm/xterm/css/xterm.css';

import { FitAddon } from '@xterm/addon-fit';
import { Terminal as Xterm } from '@xterm/xterm';
import React, { type Ref, useEffect, useImperativeHandle, useRef } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { createXtermTheme } from '../Terminal/theme.ts';

/** Imperative surface for hosts that render controls beside the terminal (a clear button, e.g.). */
export type TerminalApi = {
  clear: () => void;
  focus: () => void;
};

/**
 * Connects whatever drives the terminal — an in-browser shell, a remote PTY — to a mounted xterm.
 * The returned teardown runs before the terminal is disposed; xterm is disposed only once a returned
 * promise settles, so a driver can still write its last output while it shuts down.
 */
export type XtermAttach = (xterm: Xterm) => (() => void | Promise<void>) | void;

export type XtermViewProps = ThemedClassName<{
  /** Publishes the {@link TerminalApi} while mounted. */
  ref?: Ref<TerminalApi>;
  /** Re-run, on a fresh terminal, whenever its identity changes; memoize it. */
  attach: XtermAttach;
  fontSize?: number;
  /**
   * Fixed cell grid. With this the terminal renders exactly `cols × rows` and the element hugs the
   * grid, so a host sized by its content (a popover) shows no rounding slack; without it the
   * terminal fits itself to the container, whose trailing partial cells read as a gap.
   */
  dimensions?: { cols: number; rows: number };
}>;

/**
 * Hosts an xterm themed from the design system tokens and fitted to its container, and hands it to
 * {@link XtermViewProps.attach} to be driven.
 */
export const XtermView = ({ ref, classNames, attach, fontSize = 13, dimensions }: XtermViewProps) => {
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

    const detach = attach(xterm);

    const observer = new ResizeObserver(fit);
    observer.observe(container);

    return () => {
      xtermRef.current = null;
      cancelAnimationFrame(frame);
      themeObserver.disconnect();
      observer.disconnect();
      void Promise.resolve(detach?.()).finally(() => xterm.dispose());
    };
  }, [attach, fontSize, dimensions?.cols, dimensions?.rows]);

  return (
    <div
      className={mx('p-1 overflow-hidden', dimensions ? 'w-max h-max' : 'grow dx-fill', classNames)}
      ref={containerRef}
    />
  );
};
