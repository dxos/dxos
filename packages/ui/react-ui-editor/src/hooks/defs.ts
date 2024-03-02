//
// Copyright 2024 DXOS.org
//

import { type Extension } from '@codemirror/state';

import { type DocAccessor } from '@dxos/echo-schema';

// Runtime data structure.
export type Range = {
  from: number;
  to: number;
};

// Persistent data structure.
export type Comment = {
  id: string;
  cursor?: string;
};

export type EditorModel = {
  id: string;
  text: () => string;
  extension?: Extension;

  // TODO(burdon): Remove.
  content: string | DocAccessor;

  // TODO(burdon): Remove.
  peer?: {
    id: string;
    name?: string;
  };
};
