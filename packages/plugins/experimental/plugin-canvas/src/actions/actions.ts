//
// Copyright 2024 DXOS.org
//

// TODO(burdon): Generalize.
export type Action =
  | { type: 'debug' }
  | { type: 'grid'; on?: boolean }
  | { type: 'snap'; on?: boolean }
  | { type: 'center' }
  | { type: 'zoom-in' }
  | { type: 'zoom-out' }
  | {
      type: 'create';
    }
  | {
      type: 'delete';
      ids?: readonly string[];
    };

export type ActionHandler = (action: Action) => boolean;
