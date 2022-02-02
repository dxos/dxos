//
// Copyright 2022 DXOS.org
//

import type { Selection } from 'd3';

export type D3Selection = Selection<any, any, any, any>
export type D3Callable = (selection: D3Selection, ...args: any[]) => void
