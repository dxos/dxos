//
// Copyright 2026 DXOS.org
//

import './text-layer.css';

import { composeRefs } from '@radix-ui/react-compose-refs';
// The `legacy` build, not the default one: the default calls `Map.prototype.getOrInsertComputed`,
// which is new enough that the Chromium the storybook tests run in throws on it. Legacy targets a
// wider baseline and is the variant pdf.js publishes for exactly this.
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

import { log } from '@dxos/log';
import { composable, composableProps, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

import { type PdfMatch, type PdfPageText, findMatches, markSpan } from './pdf-search';

/**
 * pdf.js, loaded on first use rather than on import.
 *
 * At module scope it joins the plugin's own module graph, so every consumer of the components barrel
 * pays for the whole PDF engine at load — enough to push `plugin-file` past its activation timeout
 * and take plugins that depend on it down with it. Memoised, so the cost is paid once.
 *
 * The worker is bundled and served by us rather than fetched from a CDN: the app must render a PDF
 * offline, and a worker on another origin is also a CSP entry we would have to keep in step.
 */
let pdfjs: Promise<typeof import('pdfjs-dist/legacy/build/pdf.mjs')> | undefined;

const loadPdfjs = () => {
  pdfjs ??= import('pdfjs-dist/legacy/build/pdf.mjs').then((module) => {
    module.GlobalWorkerOptions.workerSrc = workerUrl;
    return module;
  });
  return pdfjs;
};

/** How a page is scaled to the viewport. */
export type PdfFit = 'width' | 'page';

/** Imperative surface the toolbar drives, published through {@link PdfCanvasProps.apiRef}. */
export type PdfApi = {
  goToPage: (page: number, behavior?: ScrollBehavior) => void;
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

/** One pass of the windowed renderer; `cancelled` unwinds it when a resize or unmount supersedes it. */
type RenderRun = { cancelled: boolean; task?: RenderTask };

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
    /** Unscaled page dimensions, so a page can be sized before it is drawn. */
    const sizesRef = useRef<({ width: number; height: number } | undefined)[]>([]);
    /** Scale each page was last drawn at, so scrolling back does not re-rasterise it. */
    const renderedRef = useRef<(number | undefined)[]>([]);
    // The live query, so a search typed before the text index finished loading can be re-run once it
    // is ready. Without this, searching a large document during its first seconds silently returns
    // nothing and never corrects itself.
    const queryRef = useRef('');
    // The page a scroll is heading towards. Stepping reads this rather than the observed page, so
    // clicking next twice quickly advances two pages instead of re-targeting the same one — smooth
    // scrolling means the observed page has not moved yet on the second click.
    const targetRef = useRef<number | undefined>(undefined);
    // Read by the imperative navigation callbacks, which must stay stable for `useImperativeHandle`
    // while still seeing the current fit mode and page count.
    const fitRef = useRef<PdfFit>(fit);
    const pageCountRef = useRef(0);
    const [pageCount, setPageCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [matches, setMatches] = useState<PdfMatch[]>([]);
    const [activeMatch, setActiveMatch] = useState(0);
    const [layoutVersion, setLayoutVersion] = useState(0);
    const [error, setError] = useState(false);

    // Tracks the in-flight render so a resize or an unmount can cancel it. Without this, tearing the
    // document down mid-render leaves `page.render(…).promise` and `getPage` rejecting with
    // `RenderingCancelledException` / `Transport destroyed` and nothing to catch them.
    const renderRef = useRef<RenderRun | undefined>(undefined);

    const cancelRender = useCallback(() => {
      const current = renderRef.current;
      if (current) {
        current.cancelled = true;
        current.task?.cancel();
        renderRef.current = undefined;
      }
    }, []);

    const getRefs = useCallback(
      (index: number): PageRefs => (refs.current[index] ??= { page: null, canvas: null, text: null }),
      [],
    );

    const runSearch = useCallback((query: string) => {
      const found = findMatches(textRef.current, query);
      setMatches(found);
      setActiveMatch(found.length > 0 ? 1 : 0);
    }, []);

    /** Page size at scale 1, resolved once so placeholders can be sized without rendering. */
    const sizePage = useCallback((index: number): { width: number; height: number } | undefined => {
      return sizesRef.current[index];
    }, []);

    /** Scale that fits a page to the container under the current fit mode. */
    const scaleFor = useCallback((size: { width: number; height: number }, fitMode: PdfFit): number => {
      const container = containerRef.current;
      if (!container) {
        return 1;
      }
      const widthScale = (container.clientWidth - PAGE_MARGIN * 2) / size.width;
      if (fitMode === 'width') {
        return widthScale;
      }
      // Fit-page must fit BOTH axes, which is what makes a landscape page usable: fitting width
      // alone leaves a wide page taller than the viewport and it reads as if fit did nothing.
      return Math.min(widthScale, (container.clientHeight - PAGE_MARGIN * 2) / size.height);
    }, []);

    // Renders one page at device resolution, so text stays sharp on a HiDPI display — a canvas
    // sized in CSS pixels renders visibly soft.
    const renderPage = useCallback(
      async (pdf: PDFDocumentProxy, pageNumber: number, fitMode: PdfFit, run: RenderRun) => {
        const { canvas, text } = getRefs(pageNumber - 1);
        const size = sizePage(pageNumber - 1);
        if (!canvas || !size || run.cancelled) {
          return;
        }

        const scale = scaleFor(size, fitMode);
        // Skip a page already drawn at this scale; scrolling back over it must not re-rasterise.
        if (renderedRef.current[pageNumber - 1] === scale) {
          return;
        }

        const page = await pdf.getPage(pageNumber);
        if (run.cancelled) {
          return;
        }

        const viewport = page.getViewport({ scale });
        const ratio = globalThis.devicePixelRatio ?? 1;
        canvas.width = Math.floor(viewport.width * ratio);
        canvas.height = Math.floor(viewport.height * ratio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const context = canvas.getContext('2d');
        if (!context) {
          return;
        }
        const task = page.render({ canvas, canvasContext: context, viewport, transform: [ratio, 0, 0, ratio, 0, 0] });
        run.task = task;
        await task.promise;
        if (run.cancelled) {
          return;
        }

        if (text) {
          text.replaceChildren();
          // `--total-scale-factor` is the property pdf.js' own stylesheet reads to size and place
          // each span; `--scale-factor` alone leaves every glyph at the default 16px.
          text.style.setProperty('--total-scale-factor', String(scale));
          text.style.setProperty('--scale-factor', String(scale));
          const { TextLayer } = await loadPdfjs();
          const layer = new TextLayer({
            textContentSource: await page.getTextContent(),
            container: text,
            viewport,
          });
          await layer.render();
        }

        renderedRef.current[pageNumber - 1] = scale;
      },
      [getRefs, scaleFor, sizePage],
    );

    /**
     * Renders the pages currently near the viewport.
     *
     * Only those, because rendering a whole document up front does not survive contact with a real
     * one: a few hundred pages is a few hundred rasterisations and text layers held at once, which
     * takes the tab down. Pages outside the window keep their placeholder box, so scroll position
     * and page numbering stay correct.
     *
     * Each page is isolated: pdf.js raises on individual pages (a JBIG2 image it cannot decode, a
     * broken font), and one such page must not stop every page after it from drawing.
     */
    const renderVisible = useCallback(
      async (pdf: PDFDocumentProxy, fitMode: PdfFit) => {
        const container = containerRef.current;
        if (!container) {
          return;
        }

        cancelRender();
        const run: RenderRun = { cancelled: false };
        renderRef.current = run;

        const origin = container.getBoundingClientRect();
        const window = origin.height * RENDER_WINDOW;
        const wanted: number[] = [];
        for (let index = 0; index < pdf.numPages; index++) {
          const element = refs.current[index]?.page;
          if (!element) {
            continue;
          }
          const rect = element.getBoundingClientRect();
          if (rect.bottom >= origin.top - window && rect.top <= origin.bottom + window) {
            wanted.push(index + 1);
          }
        }

        for (const pageNumber of wanted) {
          if (run.cancelled) {
            break;
          }
          try {
            await renderPage(pdf, pageNumber, fitMode, run);
          } catch (error) {
            if (run.cancelled) {
              break;
            }
            // Logged rather than thrown: a page pdf.js cannot draw is a property of the document,
            // and the rest of it is still worth reading.
            log.warn('failed to render page', { pageNumber, error });
          }
        }

        if (renderRef.current === run) {
          renderRef.current = undefined;
        }
        if (!run.cancelled) {
          // Highlights are measured from the rendered spans, so they can only be placed once the
          // text layers above exist at their final size.
          setLayoutVersion((version) => version + 1);
        }
      },
      [cancelRender, renderPage],
    );

    useEffect(() => {
      let cancelled = false;
      setError(false);
      setPageCount(0);
      setMatches([]);

      let task: PDFDocumentLoadingTask | undefined;
      void loadPdfjs().then(({ getDocument }) => {
        if (cancelled) {
          return;
        }
        task = getDocument({ url });
        return task.promise.then(
          async (pdf) => {
            // The loading task owns teardown; the cleanup below destroys it and the document with it.
            if (cancelled) {
              return;
            }
            documentRef.current = pdf;
            sizesRef.current = [];
            renderedRef.current = [];

            // Dimensions first, and only dimensions: they size every placeholder so the scrollbar is
            // honest from the outset, and they cost one cheap `getPage` each rather than a raster.
            for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
              if (cancelled) {
                return;
              }
              const { width, height } = (await pdf.getPage(pageNumber)).getViewport({ scale: 1 });
              sizesRef.current[pageNumber - 1] = { width, height };
            }
            if (cancelled) {
              return;
            }
            setPageCount(pdf.numPages);
            onLoad?.(pdf.numPages);

            // Text of every page, resolved once. Searching re-reads it on every keystroke, and
            // `getTextContent` is a worker round-trip per page — fine once, not once per character.
            // After the sizes, so the document is on screen before the index is built.
            const pages: PdfPageText[] = [];
            for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
              if (cancelled) {
                return;
              }
              try {
                const content = await (await pdf.getPage(pageNumber)).getTextContent();
                pages.push({ items: content.items.map((item) => ('str' in item ? item.str : '')) });
              } catch (error) {
                // A page whose text cannot be extracted is still worth showing; it just never matches.
                log.warn('failed to read page text', { pageNumber, error });
                pages.push({ items: [] });
              }
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
      });

      return () => {
        cancelled = true;
        // Cancel before destroying: `task.destroy()` tears down the transport, and any render still
        // awaiting it would reject with `Transport destroyed` after this effect is gone.
        cancelRender();
        void task?.destroy();
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

      // A resize or fit change invalidates every drawn page, since the scale moved.
      renderedRef.current = [];
      void renderVisible(pdf, fit);

      // Scrolling brings new pages into the window; coalesced to a frame so a fling does not queue
      // one pass per scroll event.
      let frame = 0;
      const onScroll = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const current = documentRef.current;
          if (current) {
            void renderVisible(current, fit);
          }
        });
      };
      container.addEventListener('scroll', onScroll, { passive: true });

      const observer =
        typeof ResizeObserver === 'undefined'
          ? undefined
          : new ResizeObserver(() => {
              const current = documentRef.current;
              if (current) {
                renderedRef.current = [];
                void renderVisible(current, fit);
              }
            });
      observer?.observe(container);
      return () => {
        cancelAnimationFrame(frame);
        container.removeEventListener('scroll', onScroll);
        observer?.disconnect();
        cancelRender();
      };
    }, [pageCount, fit, currentPage, renderVisible, cancelRender]);

    // The page under the top of the viewport is "current" — the same rule the browser's own viewer
    // uses, and the one that matches what a reader considers the page they are on.
    useEffect(() => {
      const container = containerRef.current;
      // In fit-page the visible page IS `currentPage`, so deriving it from scroll would fight the
      // pager: there is no scrolling, and every page sits at the same offset.
      if (!container || pageCount === 0 || fit === 'page') {
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
    }, [pageCount, fit]);

    const goToPageByScroll = useCallback((page: number, behavior: ScrollBehavior = 'smooth') => {
      const element = refs.current[page - 1]?.page;
      const container = containerRef.current;
      if (element && container) {
        targetRef.current = page;
        // Relative scroll for the same reason `onScroll` measures rects: the page's `offsetTop` is
        // not necessarily expressed in this container's coordinates.
        const delta = element.getBoundingClientRect().top - container.getBoundingClientRect().top;
        container.scrollTo({ top: container.scrollTop + delta - PAGE_MARGIN, behavior });
      }
    }, []);

    const goToPage = useCallback((page: number, behavior: ScrollBehavior = 'smooth') => {
      const clamped = Math.min(Math.max(page, 1), pageCountRef.current || 1);
      // Fit-page shows one page at a time, so navigating is a state change; there is nothing to
      // scroll within.
      if (fitRef.current === 'page') {
        targetRef.current = undefined;
        setCurrentPage(clamped);
        return;
      }
      goToPageByScroll(clamped, behavior);
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

    useEffect(() => {
      fitRef.current = fit;
    }, [fit]);

    useEffect(() => {
      pageCountRef.current = pageCount;
    }, [pageCount]);

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
        <div {...composableProps(props, { classNames: 'dx-fill overflow-auto' })} ref={forwardedRef}>
          <div role='alert' className='p-4 text-sm text-error-text'>
            {t('pdf-error.message')}
          </div>
        </div>
      );
    }

    const placeholderStyle = (index: number) => {
      const size = sizesRef.current[index];
      if (!size) {
        return undefined;
      }
      const scale = scaleFor(size, fit);
      return { width: Math.floor(size.width * scale), height: Math.floor(size.height * scale) };
    };

    // Fit-page is a paged view, not a scrolled one: the whole point of fitting both axes is that
    // exactly one page is on screen, so it is centred and the pager moves between pages rather than
    // scrolling within a column. Fit-width keeps the continuous column, where scrolling is the
    // natural motion.
    const single = fit === 'page';
    const shown = single ? [currentPage - 1] : Array.from({ length: pageCount }, (_, index) => index);

    return (
      <div
        data-pdf-canvas=''
        {...composableProps(props, {
          classNames: [
            'dx-fill bg-deck select-text',
            single ? 'overflow-hidden grid place-items-center' : 'overflow-auto',
          ],
        })}
        // Two refs on one node: `containerRef` measures the available width for the page scale, and
        // `forwardedRef` belongs to whatever slotted this in.
        ref={composeRefs(containerRef, forwardedRef)}
      >
        <div className={single ? 'contents' : 'flex flex-col items-center gap-4 py-4'}>
          {shown.map((index) => (
            <div
              key={index}
              data-page={index + 1}
              // Sized from the page's own dimensions rather than from its canvas, so a page outside
              // the render window still occupies its true height and the scrollbar does not lurch as
              // pages draw.
              className='relative w-fit shadow-md bg-white'
              style={placeholderStyle(index)}
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

/** Viewport heights rendered either side of the visible area, so a scroll finds pages ready. */
const RENDER_WINDOW = 1;

/** Space around and between pages, in CSS pixels; matches the `gap-4`/`py-4` on the page column. */
const PAGE_MARGIN = 16;

PdfCanvas.displayName = 'PdfCanvas';
