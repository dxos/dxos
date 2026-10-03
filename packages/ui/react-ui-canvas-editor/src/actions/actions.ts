//
// Copyright 2024 DXOS.org
//

import * as GraphEdge from '@dxos/graph/GraphEdge';

import { type LayoutKind } from '../layout/index.ts';
import { type CanvasBoard } from '../types/index.ts';

export type Action =
  | { type: 'debug' }
  | { type: 'grid'; on?: boolean }
  | { type: 'grid-snap'; on?: boolean }

  //
  | { type: 'home' }
  | { type: 'center' }
  | { type: 'zoom-in' }
  | { type: 'zoom-out' }
  | { type: 'zoom-to-fit'; duration?: number }
  | { type: 'layout'; layout?: LayoutKind }

  //
  | { type: 'select'; ids: string[]; shift?: boolean }

  //
  | { type: 'undo' }
  | { type: 'redo' }

  //
  | { type: 'cut'; ids?: string[] }
  | { type: 'copy'; ids?: string[] }
  | { type: 'paste' }
  | { type: 'create'; shape?: CanvasBoard.Shape }
  | { type: 'link'; connection: Omit<CanvasBoard.Connection, 'id'> }
  | { type: 'delete'; ids?: string[]; all?: boolean }

  //
  | { type: 'trigger'; edges?: Partial<GraphEdge.Any>[] };

export type ActionHandler = (action: Action) => Promise<boolean>;
