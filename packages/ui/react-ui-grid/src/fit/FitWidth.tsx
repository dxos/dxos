//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, useMemo, useRef, useState } from 'react';

/** Scale a width-fitted grid is drawn at: small enough to show a few columns in a card. */
export const FIT_WIDTH_SCALE = 0.75;

const MIN_COLUMN_SIZE = 64;
const MAX_COLUMN_SIZE = 200;

/** Inline padding of a cell's content (unscaled), on top of its text. */
export const CELL_PADDING = 8;

let canvas: HTMLCanvasElement | undefined;

/** Unscaled width of `text` in `element`'s font: pass the grid, whose cells inherit it. */
export const measureText = (element: Element, text: string): number => {
  canvas ??= document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    return 0;
  }
  const style = getComputedStyle(element);
  context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  return context.measureText(text).width;
};

export type UseFitWidthProps = {
  /** Unscaled width taken by columns that keep their own size (row numbers, a selection or action column). */
  reserved?: number;
  /**
   * Unscaled width each column's content wants, from the first. Columns are taken from the left at these widths
   * (clamped) while they fit. Without it, every column takes the same size.
   */
  widths?: readonly number[];
};

export type FitWidth = {
  /** Observes the box the grid fills. */
  ref: (element: HTMLElement | null) => void;
  /** Unscaled size of each column shown, which end at the box's right edge. A grid with more columns drops the rest. */
  sizes: number[];
  /** The grid's unscaled size, which `FIT_WIDTH_SCALE` shrinks to the box. */
  width: number;
  height: number;
};

/**
 * Sizes a grid's columns to fill the width of a box at `FIT_WIDTH_SCALE`, so the last column ends at its edge. Rows are
 * cropped by the box's height rather than scaled to fit.
 */
export const useFitWidth = ({ reserved = 0, widths }: UseFitWidthProps = {}): FitWidth => {
  const [box, setBox] = useState<{ width: number; height: number }>();
  const observer = useRef<ResizeObserver | null>(null);
  const ref = useMemo(
    () => (element: HTMLElement | null) => {
      observer.current?.disconnect();
      if (element) {
        observer.current = new ResizeObserver(([entry]) =>
          setBox({ width: entry.contentRect.width, height: entry.contentRect.height }),
        );
        observer.current.observe(element);
      }
    },
    [],
  );

  return useMemo(() => {
    const width = (box?.width ?? 0) / FIT_WIDTH_SCALE;
    const height = (box?.height ?? 0) / FIT_WIDTH_SCALE;
    const available = Math.max(1, width - reserved);
    return { ref, sizes: packColumns(available, widths), width, height };
  }, [ref, box, reserved, widths]);
};

const packColumns = (available: number, widths: readonly number[] | undefined): number[] => {
  if (!widths?.length) {
    const columns = Math.max(1, Math.ceil(available / MAX_COLUMN_SIZE));
    return Array.from({ length: columns }, () => available / columns);
  }

  const sizes: number[] = [];
  let used = 0;
  for (const width of widths) {
    const size = Math.min(MAX_COLUMN_SIZE, Math.max(MIN_COLUMN_SIZE, width));
    if (sizes.length > 0 && used + size > available) {
      break;
    }
    sizes.push(size);
    used += size;
  }

  const scale = used > 0 ? available / used : 1;
  return sizes.map((size) => size * scale);
};

export type FitWidthBoxProps = PropsWithChildren<{ fit: FitWidth }>;

/**
 * Fills its positioned parent and draws a grid at `FIT_WIDTH_SCALE`, inert: no cell takes focus, so no key or clipboard
 * edit reaches the data. The grid is uncapped by the viewport so it renders every cell the box shows.
 */
export const FitWidthBox = ({ fit, children }: FitWidthBoxProps) => (
  <div ref={fit.ref} inert className='dx-cover overflow-hidden'>
    <div
      className='relative [&_.dx-grid]:max-w-none! [&_.dx-grid]:max-h-none!'
      style={{
        width: fit.width,
        height: fit.height,
        transform: `scale(${FIT_WIDTH_SCALE})`,
        transformOrigin: 'top left',
      }}
    >
      {children}
    </div>
  </div>
);
