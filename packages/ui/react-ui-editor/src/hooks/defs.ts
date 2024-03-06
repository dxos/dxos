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

/**
 * @deprecated
 */
// TODO(burdon): Remove.
export type EditorModel = {
  id: string;
  text: () => string;
  content: string | DocAccessor;
  extension?: Extension;
};
