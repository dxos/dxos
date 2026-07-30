//
// Copyright 2026 DXOS.org
//

import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

import { Icon } from '@dxos/react-ui';

/** Minimal surface of foliate-js's `<foliate-view>` custom element we drive imperatively. */
type FoliateView = HTMLElement & {
  open: (file: File | Blob) => Promise<void>;
  goLeft: () => void;
  goRight: () => void;
  goTo: (target: string) => Promise<void>;
  goToFraction: (fraction: number) => Promise<void>;
  renderer: { setStyles?: (css: string) => void };
};

/**
 * A reading position: `cfi` is foliate's exact anchor; `fraction` (0–1) is the coarse progress;
 * `current`/`total` are foliate's location counts (recorded for posterity).
 */
export type ReaderLocation = { fraction: number; cfi?: string; current?: number; total?: number };

export type EpubReaderProps = {
  url: string;
  title?: string;
  /** Exact position (foliate CFI) to restore on open; preferred over `initialFraction`. */
  initialCfi?: string;
  /** Fallback position (0–1) to restore when no CFI is available (e.g. an imported percent). */
  initialFraction?: number;
  /** Called with the reading position as the reader relocates (page turns, navigation). */
  onRelocate?: (location: ReaderLocation) => void;
};

/** Imperative paging handle exposed to the toolbar (direction-aware previous/next page). */
export type EpubReaderHandle = { goLeft: () => void; goRight: () => void };

// Content stylesheet applied inside the book's iframes (foliate renders nothing until styles + a first
// page are requested). `color-scheme: light dark` lets the page adapt to the host's dark theme —
// without it the content is invisible against the dark surface.
const READER_CSS = `
  @namespace epub "http://www.idpf.org/2007/ops";
  html { color-scheme: light dark; }
  @media (prefers-color-scheme: dark) { a:link { color: lightblue; } }
  p, li, blockquote, dd { line-height: 1.5; text-align: start; }
`;

/**
 * Inline EPUB reader backed by foliate-js's `<foliate-view>` web component. foliate-js is a
 * browser-only ESM package, so it is imported lazily (a dynamic import) — this keeps it out of the
 * node/SSR bundle and only fetched when a reader is actually shown.
 */
export const EpubReader = forwardRef<EpubReaderHandle, EpubReaderProps>(
  ({ url, title, initialCfi, initialFraction, onRelocate }, forwardedRef) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<FoliateView | undefined>(undefined);
    // Latest relocate callback, read from the effect without re-opening the book when it changes.
    const onRelocateRef = useRef(onRelocate);
    onRelocateRef.current = onRelocate;
    const [failed, setFailed] = useState(false);

    // Paging drives the live `<foliate-view>` instance (created in the effect); no-op until it is opened.
    useImperativeHandle(
      forwardedRef,
      () => ({
        goLeft: () => viewRef.current?.goLeft(),
        goRight: () => viewRef.current?.goRight(),
      }),
      [],
    );

    useEffect(() => {
      let cancelled = false;
      let view: FoliateView | undefined;
      void (async () => {
        try {
          // Registers the `<foliate-view>` custom element as a side effect.
          await import('foliate-js/view.js');
          const container = containerRef.current;
          if (cancelled || !container) {
            return;
          }
          const response = await fetch(url);
          const file = new File([await response.blob()], `${title ?? 'book'}.epub`, {
            type: 'application/epub+zip',
          });
          // `document.createElement` returns a bare `HTMLElement`; the custom element adds `open`.
          view = document.createElement('foliate-view') as FoliateView;
          // The custom element has no intrinsic size (renders 0×0); size it to fill the container so
          // foliate paginates against real dimensions.
          view.style.display = 'block';
          view.style.inlineSize = '100%';
          view.style.blockSize = '100%';
          container.appendChild(view);
          // Report the reading position on every page turn / navigation.
          view.addEventListener('relocate', (event) => {
            const detail = (
              event as CustomEvent<{ fraction?: number; cfi?: string; location?: { current?: number; total?: number } }>
            ).detail;
            if (typeof detail?.fraction === 'number') {
              onRelocateRef.current?.({
                fraction: detail.fraction,
                cfi: detail.cfi,
                current: detail.location?.current,
                total: detail.location?.total,
              });
            }
          });
          await view.open(file);
          view.renderer.setStyles?.(READER_CSS);
          // `open()` paints nothing until a page is requested. Restore the exact CFI when we have one
          // (fraction restore snaps to the nearest page); otherwise the saved fraction, else the start.
          if (initialCfi) {
            await view.goTo(initialCfi);
          } else {
            await view.goToFraction(initialFraction ?? 0);
          }
          viewRef.current = view;
        } catch {
          if (!cancelled) {
            setFailed(true);
          }
        }
      })();
      return () => {
        cancelled = true;
        viewRef.current = undefined;
        view?.remove();
      };
    }, [url, title]);

    if (failed) {
      return (
        <div role='none' className='grid bs-full place-items-center gap-2 p-4 text-center text-description'>
          <Icon icon='ph--warning--regular' size={6} />
        </div>
      );
    }

    return <div ref={containerRef} role='none' className='is-full bs-full overflow-hidden' />;
  },
);

EpubReader.displayName = 'EpubReader';
