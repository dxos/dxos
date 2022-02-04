//
// Copyright 2022 DXOS.org
//

import type { D3DragEvent as DragEvent, Selection } from 'd3';

// Extends MouseEvent (e.g., subject).
export type D3DragEvent = DragEvent<any, any, any>

// const selection: D3Selection = d3.select()
export type D3Selection = Selection<any, any, any, any>

// selection.call(callable: D3Callable)
export type D3Callable = (selection: D3Selection, ...args: any[]) => void
