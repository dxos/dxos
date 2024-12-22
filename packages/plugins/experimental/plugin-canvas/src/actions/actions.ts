//
// Copyright 2024 DXOS.org
//

import { type LayoutKind } from '../layout';
import { type Shape } from '../types';

export type Action =
  | { type: 'debug' }
  | { type: 'grid'; on?: boolean }
  | { type: 'grid-snap'; on?: boolean }
  | { type: 'select'; ids: string[]; shift?: boolean }
  | { type: 'home' }
  | { type: 'center' }
  | { type: 'zoom-in' }
  | { type: 'zoom-out' }
  | { type: 'zoom-to-fit'; duration?: number }
  | { type: 'layout'; layout?: LayoutKind }
  | { type: 'create'; shape?: Shape }
  | { type: 'link'; source: string; target: string }
  | { type: 'delete'; ids?: string[]; all?: boolean }
  | { type: 'run'; id?: string };

export type ActionHandler = (action: Action) => Promise<boolean>;
