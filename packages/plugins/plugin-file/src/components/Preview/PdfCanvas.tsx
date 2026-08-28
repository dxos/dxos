//
// Copyright 2026 DXOS.org
//

// The `legacy` build, not the default one: the default calls `Map.prototype.getOrInsertComputed`,
// which is new enough that the Chromium the storybook tests run in throws on it. Legacy targets a
// wider baseline and is the variant pdf.js publishes for exactly this.
import {
  GlobalWorkerOptions,
  type PDFDocumentProxy,
  type RenderTask,
  getDocument,
} from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

// Bundled and served by us rather than fetched from a CDN: the app must render a PDF offline, and a
// worker from another origin is also a CSP entry we would otherwise have to keep in step.
GlobalWorkerOptions.workerSrc = workerUrl;

export type PdfCanvasProps = ThemedClassName<{
  url: string;
  onLoad?: (pageCount: number) => void;
}>;

/**
 * Renders a PDF to stacked canvases, one per page.
 *
 * Replaces an `<iframe>` pointed at the browser's built-in viewer. That viewer lives in its own
 * origin — a `chrome-extension://` document — so its background, toolbar and zoom chrome cannot be
 * styled, and it letterboxes the page in grey no matter what the surrounding plank looks like.
 *
 * Every page is rendered rather than one at a time: the iframe it replaces scrolled through the
 * whole document, so paginating here would silently hide content behind navigation that does not
 * exist yet. Large documents therefore cost their full page count up front — virtualization is the
 * obvious next step if that becomes a problem.
 */
export const PdfCanvas = ({ classNames, url, onLoad }: PdfCanvasProps) => {
  const { t } = useTranslation(meta.profile.key);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasesRef = useRef<(HTMLCanvasElement | null)[]>([]);
  const documentRef = useRef<PDFDocumentProxy | undefined>(undefined);
  const [pageCount, setPageCount] = useState(0);
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

  // Fits each page to the container's width, at device resolution so text stays sharp on a HiDPI
  // display — a canvas sized in CSS pixels renders visibly soft.
  const renderPages = useCallback(
    async (pdf: PDFDocumentProxy) => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      cancelRender();
      const run: { cancelled: boolean; task?: RenderTask } = { cancelled: false };
      renderRef.current = run;

      try {
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          const canvas = canvasesRef.current[pageNumber - 1];
          if (!canvas || run.cancelled) {
            continue;
          }

          const page = await pdf.getPage(pageNumber);
          if (run.cancelled) {
            return;
          }

          const unscaled = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: container.clientWidth / unscaled.width });
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
      }
    },
    [cancelRender],
  );

  useEffect(() => {
    let cancelled = false;
    setError(false);
    setPageCount(0);

    const task = getDocument({ url });
    void task.promise.then(
      (pdf) => {
        // The loading task owns teardown; the cleanup below destroys it and the document with it.
        if (cancelled) {
          return;
        }
        documentRef.current = pdf;
        setPageCount(pdf.numPages);
        onLoad?.(pdf.numPages);
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
    };
    // `onLoad` is deliberately not a dependency: callers pass an inline function, which would
    // re-fetch the document on every render.
  }, [url, cancelRender]);

  // Runs after the canvases for `pageCount` exist, and again whenever the plank is resized so pages
  // keep filling the available width.
  useEffect(() => {
    const pdf = documentRef.current;
    const container = containerRef.current;
    if (!pdf || !container || pageCount === 0) {
      return;
    }

    void renderPages(pdf);
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(() => {
      const current = documentRef.current;
      if (current) {
        void renderPages(current);
      }
    });
    observer.observe(container);
    return () => {
      observer.disconnect();
      cancelRender();
    };
  }, [pageCount, renderPages, cancelRender]);

  return (
    <div ref={containerRef} className={mx('h-full w-full overflow-auto', classNames)}>
      {error ? (
        <div role='alert' className='p-4 text-sm text-error-text'>
          {t('pdf-error.message')}
        </div>
      ) : (
        Array.from({ length: pageCount }, (_, index) => (
          <canvas
            key={index}
            ref={(element) => {
              canvasesRef.current[index] = element;
            }}
            className='mx-auto'
          />
        ))
      )}
    </div>
  );
};

PdfCanvas.displayName = 'PdfCanvas';
