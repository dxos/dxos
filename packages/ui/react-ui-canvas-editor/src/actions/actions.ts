//
// Copyright 2024 DXOS.org
//

import { type Graph } from '@dxos/graph';

import { type LayoutKind } from '../layout';
import { type Connection, type Shape } from '../types';

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
  | { type: 'create'; shape?: Shape }
  | { type: 'link'; connection: Omit<Connection, 'id'> }
  | { type: 'delete'; ids?: string[]; all?: boolean }

  //
  | { type: 'trigger'; edges?: Partial<Graph.Edge>[] };

export type ActionHandler = (action: Action) => Promise<boolean>;
