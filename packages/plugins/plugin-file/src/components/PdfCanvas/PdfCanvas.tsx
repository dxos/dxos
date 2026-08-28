//
// Copyright 2026 DXOS.org
//

import './text-layer.css';

import { composeRefs } from '@radix-ui/react-compose-refs';
// The `legacy` build, not the default one: the default calls `Map.prototype.getOrInsertComputed`,
// which is new enough that the Chromium the storybook tests run in throws on it. Legacy targets a
// wider baseline and is the variant pdf.js publishes for exactly this.
import {
  GlobalWorkerOptions,
  type PDFDocumentProxy,
  type RenderTask,
  TextLayer,
  getDocument,
} from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

import { composable, composableProps, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

import { type PdfMatch, type PdfPageText, findMatches, markSpan } from './pdf-search';

// Bundled and served by us rather than fetched from a CDN: the app must render a PDF offline, and a
// worker from another origin is also a CSP entry we would otherwise have to keep in step.
GlobalWorkerOptions.workerSrc = workerUrl;

/** How a page is scaled to the viewport. */
export type PdfFit = 'width' | 'page';

/** Imperative surface the toolbar drives, published through {@link PdfCanvasProps.apiRef}. */
export type PdfApi = {
  goToPage: (page: number) => void;
  /** Steps by `delta` from the pending target, so repeated clicks accumulate mid-scroll. */
  stepPage: (delta: number) => void;
  search: (query: string) => void;
  goToMatch: (index: number) => void;
};

export type PdfCanvasState = {
  pageCount: number;
  currentPage: number;
  matches: number;
  activeMatch: number;
};

export type PdfCanvasProps = {
  url: string;
  fit?: PdfFit;
  onLoad?: (pageCount: number) => void;
  onStateChange?: (state: PdfCanvasState) => void;
  apiRef?: React.Ref<PdfApi>;
};

type PageRefs = {
  page: HTMLDivElement | null;
  canvas: HTMLCanvasElement | null;
  text: HTMLDivElement | null;
};

/**
 * Renders a PDF to stacked canvases, one per page, each with a selectable text layer over it.
 *
 * Replaces an `<iframe>` pointed at the browser's built-in viewer. That viewer lives in its own
 * origin — a `chrome-extension://` document — so nothing about it can be styled or driven. Owning
 * the render means the toolbar can page, fit and search, and the pages can be themed.
 *
 * The text layer is what makes the page more than a picture: it is transparent text positioned over
 * the canvas, so the browser can select it and search matches can be highlighted by wrapping them
 * in the layer's own spans rather than by positioning overlays over the page.
 *
 * Every page is rendered rather than one at a time: the iframe it replaces scrolled through the
 * whole document. Large documents therefore cost their full page count up front — virtualization is
 * the obvious next step if that becomes a problem.
 */
export const PdfCanvas = composable<HTMLDivElement, PdfCanvasProps>(
  ({ url, fit = 'width', onLoad, onStateChange, apiRef, ...props }, forwardedRef) => {
    const { t } = useTranslation(meta.profile.key);
    const containerRef = useRef<HTMLDivElement>(null);
    const refs = useRef<PageRefs[]>([]);
    const documentRef = useRef<PDFDocumentProxy | undefined>(undefined);
    const textRef = useRef<PdfPageText[]>([]);
    // The live query, so a search typed before the text index finished loading can be re-run once it
    // is ready. Without this, searching a large document during its first seconds silently returns
    // nothing and never corrects itself.
    const queryRef = useRef('');
    // The page a scroll is heading towards. Stepping reads this rather than the observed page, so
    // clicking next twice quickly advances two pages instead of re-targeting the same one — smooth
    // scrolling means the observed page has not moved yet on the second click.
    const targetRef = useRef<number | undefined>(undefined);
    const [pageCount, setPageCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [matches, setMatches] = useState<PdfMatch[]>([]);
    const [activeMatch, setActiveMatch] = useState(0);
    const [layoutVersion, setLayoutVersion] = useState(0);
    const [error, setError] = useState(false);

    // Tracks the in-flight render so a resize or an unmount can cancel it. Without this, tearing the
    // document down mid-render leaves `page.render(…).promise` and `getPage` rejecting with
    // `RenderingCancelledException` / `Transport destroyed` and nothing to catch them.
    const renderRef = useRef<{ cancelled: boolean; task?: RenderTask } | undefined>(undefined);

    const cancelRender = useCallback(() => {
      const current = renderRef.current;
      if (current) {
        current.cancelled = true;
        current.task?.cancel();
        renderRef.current = undefined;
      }
    }, []);

    const getRefs = (index: number): PageRefs => (refs.current[index] ??= { page: null, canvas: null, text: null });

    const runSearch = useCallback((query: string) => {
      const found = findMatches(textRef.current, query);
      setMatches(found);
      setActiveMatch(found.length > 0 ? 1 : 0);
    }, []);

    // Fits each page to the container, at device resolution so text stays sharp on a HiDPI display —
    // a canvas sized in CSS pixels renders visibly soft.
    const renderPages = useCallback(
      async (pdf: PDFDocumentProxy, fitMode: PdfFit) => {
        const container = containerRef.current;
        if (!container) {
          return;
        }

        cancelRender();
        const run: { cancelled: boolean; task?: RenderTask } = { cancelled: false };
        renderRef.current = run;

        try {
          for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
            const { canvas, text } = getRefs(pageNumber - 1);
            if (!canvas || run.cancelled) {
              continue;
            }

            const page = await pdf.getPage(pageNumber);
            if (run.cancelled) {
              return;
            }

            const unscaled = page.getViewport({ scale: 1 });
            // Fit-page uses the smaller of the two ratios so the whole page is visible; fit-width
            // ignores height and lets the page scroll. Both leave room for the gap between pages.
            const widthScale = (container.clientWidth - PAGE_MARGIN * 2) / unscaled.width;
            const scale =
              fitMode === 'page'
                ? Math.min(widthScale, (container.clientHeight - PAGE_MARGIN * 2) / unscaled.height)
                : widthScale;
            const viewport = page.getViewport({ scale });
            const ratio = globalThis.devicePixelRatio ?? 1;

            canvas.width = Math.floor(viewport.width * ratio);
            canvas.height = Math.floor(viewport.height * ratio);
            canvas.style.width = `${Math.floor(viewport.width)}px`;
            canvas.style.height = `${Math.floor(viewport.height)}px`;

            const context = canvas.getContext('2d');
            if (!context) {
              continue;
            }
            run.task = page.render({
              canvas,
              canvasContext: context,
              viewport,
              transform: [ratio, 0, 0, ratio, 0, 0],
            });
            await run.task.promise;

            if (text && !run.cancelled) {
              text.replaceChildren();
              // pdf.js positions the spans from this custom property, so it has to be set on the
              // layer before rendering or every span lands at the wrong scale.
              text.style.setProperty('--scale-factor', String(scale));
              text.style.width = `${Math.floor(viewport.width)}px`;
              text.style.height = `${Math.floor(viewport.height)}px`;
              const layer = new TextLayer({
                textContentSource: await page.getTextContent(),
                container: text,
                viewport,
              });
              await layer.render();
            }
          }
        } catch (error) {
          // A cancelled render is the expected outcome of a resize or an unmount, not a fault. Any
          // other failure is a real one and must not be swallowed.
          if (!run.cancelled) {
            throw error;
          }
        } finally {
          if (renderRef.current === run) {
            renderRef.current = undefined;
          }
          if (!run.cancelled) {
            // Highlights are measured from the rendered spans, so they can only be placed once the
            // text layer above exists at its final size.
            setLayoutVersion((version) => version + 1);
          }
        }
      },
      [cancelRender],
    );

    useEffect(() => {
      let cancelled = false;
      setError(false);
      setPageCount(0);
      setMatches([]);

      const task = getDocument({ url });
      void task.promise.then(
        async (pdf) => {
          // The loading task owns teardown; the cleanup below destroys it and the document with it.
          if (cancelled) {
            return;
          }
          documentRef.current = pdf;
          setPageCount(pdf.numPages);
          onLoad?.(pdf.numPages);

          // Text of every page, resolved once. Searching re-reads it on every keystroke, and
          // `getTextContent` is a worker round-trip per page — fine once, not once per character.
          const pages: PdfPageText[] = [];
          for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
            const page = await pdf.getPage(pageNumber);
            const content = await page.getTextContent();
            pages.push({ items: content.items.map((item) => ('str' in item ? item.str : '')) });
          }
          if (!cancelled) {
            textRef.current = pages;
            if (queryRef.current.trim()) {
              runSearch(queryRef.current);
            }
          }
        },
        () => {
          if (!cancelled) {
            setError(true);
          }
        },
      );

      return () => {
        cancelled = true;
        // Cancel before destroying: `task.destroy()` tears down the transport, and any render still
        // awaiting it would reject with `Transport destroyed` after this effect is gone.
        cancelRender();
        void task.destroy();
        documentRef.current = undefined;
        textRef.current = [];
      };
      // `onLoad` is deliberately not a dependency: callers pass an inline function, which would
      // re-fetch the document on every render.
    }, [url, cancelRender, runSearch]);

    // Runs after the canvases for `pageCount` exist, and again on resize or a fit change so pages
    // keep filling the available space.
    useEffect(() => {
      const pdf = documentRef.current;
      const container = containerRef.current;
      if (!pdf || !container || pageCount === 0) {
        return;
      }

      void renderPages(pdf, fit);
      if (typeof ResizeObserver === 'undefined') {
        return;
      }
      const observer = new ResizeObserver(() => {
        const current = documentRef.current;
        if (current) {
          void renderPages(current, fit);
        }
      });
      observer.observe(container);
      return () => {
        observer.disconnect();
        cancelRender();
      };
    }, [pageCount, fit, renderPages, cancelRender]);

    // The page under the top of the viewport is "current" — the same rule the browser's own viewer
    // uses, and the one that matches what a reader considers the page they are on.
    useEffect(() => {
      const container = containerRef.current;
      if (!container || pageCount === 0) {
        return;
      }

      // Measured from bounding rects rather than `offsetTop`: that is relative to the nearest
      // *positioned* ancestor, which is not necessarily this scroll container, and comparing it to
      // `scrollTop` reported the wrong page at rest.
      const onScroll = () => {
        const origin = container.getBoundingClientRect().top;
        let page = 1;
        for (let index = 0; index < pageCount; index++) {
          const element = refs.current[index]?.page;
          if (element && element.getBoundingClientRect().top - origin <= PAGE_MARGIN + 8) {
            page = index + 1;
          }
        }
        setCurrentPage(page);
        if (targetRef.current === page) {
          targetRef.current = undefined;
        }
      };

      container.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
      return () => container.removeEventListener('scroll', onScroll);
    }, [pageCount]);

    const goToPage = useCallback((page: number) => {
      const element = refs.current[page - 1]?.page;
      const container = containerRef.current;
      if (element && container) {
        targetRef.current = page;
        // Relative scroll for the same reason `onScroll` measures rects: the page's `offsetTop` is
        // not necessarily expressed in this container's coordinates.
        const delta = element.getBoundingClientRect().top - container.getBoundingClientRect().top;
        container.scrollTo({ top: container.scrollTop + delta - PAGE_MARGIN, behavior: 'smooth' });
      }
    }, []);

    const stepPage = useCallback(
      (delta: number) => {
        const base = targetRef.current ?? currentPage;
        goToPage(Math.min(Math.max(base + delta, 1), pageCount));
      },
      [currentPage, pageCount, goToPage],
    );

    const search = useCallback(
      (query: string) => {
        queryRef.current = query;
        runSearch(query);
      },
      [runSearch],
    );

    const goToMatch = useCallback(
      (index: number) => {
        if (matches.length === 0) {
          return;
        }
        // Wraps in both directions, so `next` on the last match returns to the first.
        const next = ((index - 1 + matches.length) % matches.length) + 1;
        setActiveMatch(next);
        goToPage(matches[next - 1].page);
      },
      [matches, goToPage],
    );

    useImperativeHandle(apiRef, () => ({ goToPage, stepPage, search, goToMatch }), [
      goToPage,
      stepPage,
      search,
      goToMatch,
    ]);

    // Rewrites the spans in place whenever the matches, the active one, or the layout change. The
    // layout dependency matters: a re-render replaces the spans, discarding any marks on them.
    useEffect(() => {
      refs.current.forEach((pageRefs, pageIndex) => {
        const layer = pageRefs?.text;
        const items = textRef.current[pageIndex]?.items;
        if (!layer || !items) {
          return;
        }
        items.forEach((text, itemIndex) => {
          // The layer alternates spans and `<br>`: pdf.js emits one child per text item, a `<br>`
          // for the end-of-line ones, so child index tracks item index. Skip the breaks explicitly
          // rather than relying on their empty text never matching.
          const span = layer.children[itemIndex];
          if (!(span instanceof HTMLElement) || span.tagName !== 'SPAN') {
            return;
          }
          const ranges = matches.flatMap((match, index) =>
            match.page === pageIndex + 1 && match.item === itemIndex
              ? [{ offset: match.offset, length: match.length, active: index + 1 === activeMatch }]
              : [],
          );
          markSpan(span, text, ranges);
        });
      });
    }, [matches, activeMatch, layoutVersion]);

    useEffect(() => {
      onStateChange?.({ pageCount, currentPage, matches: matches.length, activeMatch });
      // `onStateChange` is excluded for the same reason as `onLoad` above.
    }, [pageCount, currentPage, matches.length, activeMatch]);

    if (error) {
      return (
        <div {...composableProps(props, { classNames: 'h-full w-full overflow-auto' })} ref={forwardedRef}>
          <div role='alert' className='p-4 text-sm text-error-text'>
            {t('pdf-error.message')}
          </div>
        </div>
      );
    }

    return (
      <div
        {...composableProps(props, { classNames: 'h-full w-full overflow-auto bg-deck select-text' })}
        // Two refs on one node: `containerRef` measures the available width for the page scale, and
        // `forwardedRef` belongs to whatever slotted this in.
        ref={composeRefs(containerRef, forwardedRef)}
      >
        <div role='none' className='flex flex-col items-center gap-4 py-4'>
          {Array.from({ length: pageCount }, (_, index) => (
            <div
              key={index}
              data-page={index + 1}
              className='relative w-fit shadow-md'
              ref={(element) => {
                getRefs(index).page = element;
              }}
            >
              <canvas
                className='block'
                ref={(element) => {
                  getRefs(index).canvas = element;
                }}
              />
              <div
                className='dx-pdf-text-layer'
                ref={(element) => {
                  getRefs(index).text = element;
                }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  },
);

/** Space around and between pages, in CSS pixels; matches the `gap-4`/`py-4` on the page column. */
const PAGE_MARGIN = 16;

PdfCanvas.displayName = 'PdfCanvas';
