//
// Copyright 2025 DXOS.org
//

import type { BaseType, D3DragEvent as DragEvent, DraggedElementBaseType, Selection } from 'd3';

// Extends MouseEvent (e.g., subject).
export type D3DragEvent<GElement extends DraggedElementBaseType = any, Datum = any, Subject = any> = DragEvent<
  GElement,
  Datum,
  Subject
>;

// const selection: D3Selection<E, T> = d3.select<E, T>()
export type D3Selection<
  GElement extends BaseType = any,
  Datum = any,
  PElement extends BaseType = any,
  PDatum = any,
> = Selection<GElement, Datum, PElement, PDatum>;

// d3.select<E, T>().call(callable: D3Callable<E, T>)
export type D3Callable<GElement extends BaseType = any, Datum = any, PElement extends BaseType = any, PDatum = any> = (
  selection: D3Selection<GElement, Datum, PElement, PDatum>,
  ...args: any[]
) => void;
