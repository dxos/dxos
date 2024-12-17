//
// Copyright 2024 DXOS.org
//

import { type Shape } from '../graph';

export type Action =
  | { type: 'debug' }
  | { type: 'grid'; on?: boolean }
  | { type: 'snap'; on?: boolean }
  | { type: 'select'; ids: string[]; shift?: boolean }
  | { type: 'home' }
  | { type: 'center' }
  | { type: 'zoom-in' }
  | { type: 'zoom-out' }
  | { type: 'create'; shape?: Shape }
  | { type: 'link'; source: string; target: string }
  | { type: 'delete'; ids?: string[] };

export type ActionHandler = (action: Action) => boolean;
