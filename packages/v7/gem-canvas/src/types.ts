//
// Copyright 2022 DXOS.org
//

import type { D3DragEvent as DragEvent, Selection } from 'd3';

export type D3DragEvent = DragEvent<any, any, any>

export type D3Selection = Selection<any, any, any, any>

export type D3Call = (selection: D3Selection, ...args: any[]) => void
