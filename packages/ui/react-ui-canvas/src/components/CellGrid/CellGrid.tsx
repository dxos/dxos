//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect-atom/atom-react';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import type { ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { Ruler, TrackHeader } from './headers';
import { attachPointerHandlers, attachWheelHandlers, type PointerHandlers } from './input';
import { drawCells, drawOverlay, type OverlayStyle, type RenderCell, type StaticLayerStyle } from './render';
import type { CellGridAtoms } from './state/atoms';
import type { Cell, Headers, Row } from './state/types';

export type CellGridProps<T = unknown> = ThemedClassName<
  PointerHandlers & {
    atoms: CellGridAtoms<T>;
    rows: ReadonlyArray<Row>;
    renderCell: RenderCell<T>;
    headers?: Partial<Headers> | false;
    staticStyle?: Partial<StaticLayerStyle>;
    overlayStyle?: Partial<OverlayStyle>;
  }
>;

const defaultHeaders: Headers = { left: 80, top: 24 };

const defaultStaticStyle: StaticLayerStyle = {
  gridLine: 'rgba(128,128,128,0.25)',
  rowBand: 'rgba(128,128,128,0.06)',
};

const defaultOverlayStyle: OverlayStyle = {
  playhead: 'rgb(220, 38, 38)',
  selectionFill: 'rgba(59, 130, 246, 0.15)',
  selectionStroke: 'rgb(59, 130, 246)',
};

const setupCanvas = (canvas: HTMLCanvasElement, width: number, height: number): CanvasRenderingContext2D | null => {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(width * dpr));
  canvas.height = Math.max(1, Math.floor(height * dpr));
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
};

/**
 * Canvas-based 2D grid where cells contain pluggable shapes. Suitable for music sequencers,
 * time-series data viz, and similar workloads at ~1k visible cells per viewport.
 */
export const CellGrid = <T,>({
  atoms,
  rows,
  renderCell,
  headers: headersProp,
  staticStyle: staticStyleProp,
  overlayStyle: overlayStyleProp,
  classNames,
  onCellToggle,
  onSelectionCommit,
  onDrawUpdate,
  onDrawCommit,
}: CellGridProps<T>) => {
  const registry = useContext(RegistryContext);

  const headers = useMemo<Headers>(() => {
    if (headersProp === false) {
      return { left: 0, top: 0 };
    }
    return { ...defaultHeaders, ...(headersProp ?? {}) };
  }, [headersProp]);

  const staticStyle = useMemo<StaticLayerStyle>(
    () => ({ ...defaultStaticStyle, ...(staticStyleProp ?? {}) }),
    [staticStyleProp],
  );
  const overlayStyle = useMemo<OverlayStyle>(
    () => ({ ...defaultOverlayStyle, ...(overlayStyleProp ?? {}) }),
    [overlayStyleProp],
  );

  const { ref: containerRef, width = 0, height = 0 } = useResizeDetector<HTMLDivElement>();
  const staticCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayInputRef = useRef<HTMLDivElement>(null);

  const [staticCtx, setStaticCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [overlayCtx, setOverlayCtx] = useState<CanvasRenderingContext2D | null>(null);

  // Track header rerenders for the React-side ruler/track-header.
  const [viewportState, setViewportState] = useState(() => registry.get(atoms.viewport));

  // Resize canvases on container resize.
  useEffect(() => {
    if (!width || !height) {
      return;
    }
    if (staticCanvasRef.current) {
      const ctx = setupCanvas(staticCanvasRef.current, width, height);
      setStaticCtx(ctx);
    }
    if (overlayCanvasRef.current) {
      const ctx = setupCanvas(overlayCanvasRef.current, width, height);
      setOverlayCtx(ctx);
    }
  }, [width, height]);

  // Mirror viewport into React state so headers re-render on scroll/zoom.
  useEffect(() => registry.subscribe(atoms.viewport, (next) => setViewportState(next)), [registry, atoms.viewport]);

  // Static-layer redraw on (cells, viewport, rows, headers, style, size) change.
  useEffect(() => {
    if (!staticCtx || !width || !height) {
      return;
    }
    let raf: number | null = null;
    const schedule = () => {
      if (raf !== null) {
        return;
      }
      raf = requestAnimationFrame(() => {
        raf = null;
        drawCells({
          ctx: staticCtx,
          size: { width, height },
          viewport: registry.get(atoms.viewport),
          headers,
          rows,
          cells: registry.get(atoms.cells),
          renderCell,
          style: staticStyle,
        });
      });
    };
    schedule();
    const unsubCells = registry.subscribe(atoms.cells, schedule);
    const unsubViewport = registry.subscribe(atoms.viewport, schedule);
    return () => {
      if (raf !== null) {
        cancelAnimationFrame(raf);
      }
      unsubCells();
      unsubViewport();
    };
  }, [staticCtx, width, height, registry, atoms.cells, atoms.viewport, headers, rows, renderCell, staticStyle]);

  // Overlay rAF loop while playhead or active selection drag.
  useEffect(() => {
    if (!overlayCtx || !width || !height) {
      return;
    }
    let raf: number | null = null;
    let stopped = false;

    const paint = () => {
      drawOverlay({
        ctx: overlayCtx,
        size: { width, height },
        viewport: registry.get(atoms.viewport),
        headers,
        selection: registry.get(atoms.selection),
        playhead: registry.get(atoms.playhead),
        style: overlayStyle,
      });
    };

    const isAnimating = () => registry.get(atoms.playhead) !== null;

    const loop = () => {
      if (stopped) {
        return;
      }
      paint();
      if (isAnimating()) {
        raf = requestAnimationFrame(loop);
      } else {
        raf = null;
      }
    };

    const kick = () => {
      paint();
      if (raf === null && isAnimating()) {
        raf = requestAnimationFrame(loop);
      }
    };

    kick();
    const unsubSelection = registry.subscribe(atoms.selection, () => paint());
    const unsubPlayhead = registry.subscribe(atoms.playhead, kick);
    const unsubViewport = registry.subscribe(atoms.viewport, () => paint());

    return () => {
      stopped = true;
      if (raf !== null) {
        cancelAnimationFrame(raf);
      }
      unsubSelection();
      unsubPlayhead();
      unsubViewport();
    };
  }, [overlayCtx, width, height, registry, atoms.selection, atoms.playhead, atoms.viewport, headers, overlayStyle]);

  // Input wiring. Keep the callbacks in a ref so the listener attachment is stable
  // across consumer re-renders — otherwise an in-progress drag is torn down when
  // the parent's onCellToggle identity changes (e.g. after the very mutation we
  // just triggered), and subsequent pointermove events see drag === null.
  const callbacksRef = useRef<PointerHandlers>({ onCellToggle, onSelectionCommit, onDrawUpdate, onDrawCommit });
  callbacksRef.current = { onCellToggle, onSelectionCommit, onDrawUpdate, onDrawCommit };
  useEffect(() => {
    const element = overlayInputRef.current;
    if (!element) {
      return;
    }
    const detachPointer = attachPointerHandlers(element, {
      registry,
      atoms,
      headers,
      handlers: {
        onCellToggle: (coord, mode) => callbacksRef.current.onCellToggle?.(coord, mode),
        onSelectionCommit: (range) => callbacksRef.current.onSelectionCommit?.(range),
        onDrawUpdate: (start, end) => callbacksRef.current.onDrawUpdate?.(start, end),
        onDrawCommit: (start, end) => callbacksRef.current.onDrawCommit?.(start, end),
      },
    });
    const detachWheel = attachWheelHandlers(element, { registry, atoms, headers });
    return () => {
      detachPointer();
      detachWheel();
    };
  }, [registry, atoms, headers]);

  return (
    <div ref={containerRef} className={mx('relative w-full h-full overflow-hidden bg-baseSurface', classNames)}>
      {/*
        Canvases are nudged up + left 1 CSS pixel so the gridlines (drawn at the TOP
        and LEFT edges of each cell) sit on top of the frozen header dividers — the
        TrackHeader's right border and bottom-row box-shadow, which both render 1px
        inside the box. Without this offset the canvas gridlines land 1px down/right
        of the header dividers and the columns read as misaligned.
      */}
      <canvas ref={staticCanvasRef} className='absolute inset-0 pointer-events-none' style={{ top: -1, left: -1 }} />
      <canvas ref={overlayCanvasRef} className='absolute inset-0 pointer-events-none' style={{ top: -1, left: -1 }} />
      <div
        ref={overlayInputRef}
        className='absolute inset-0 touch-none'
        style={{ paddingLeft: headers.left, paddingTop: headers.top }}
      />
      {headers.top > 0 && <Ruler viewport={viewportState} headers={headers} width={width} />}
      {headers.left > 0 && <TrackHeader viewport={viewportState} headers={headers} rows={rows} height={height} />}
      {headers.top > 0 && headers.left > 0 && (
        <div
          className='absolute top-0 left-0 border-b border-r border-neutral-200 dark:border-neutral-700 bg-baseSurface'
          style={{ width: headers.left, height: headers.top }}
        />
      )}
    </div>
  );
};

export type { Cell };
