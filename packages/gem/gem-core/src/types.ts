//
// Copyright 2022 DXOS.org
//

import type { D3DragEvent as DragEvent, Selection } from 'd3';

// Extends MouseEvent (e.g., subject).
export type D3DragEvent = DragEvent<any, any, any>

// const selection: D3Selection<E, T> = d3.select<E, T>()
export type D3Selection = Selection<any, any, any, any>

// d3.select<E, T>().call(callable: D3Callable<E, T>)
export type D3Callable = (selection: D3Selection, ...args: any[]) => void
