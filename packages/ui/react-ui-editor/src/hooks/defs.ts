//
// Copyright 2024 DXOS.org
//

import { type Extension, StateField } from '@codemirror/state';
import type * as YP from 'y-protocols/awareness';

import { type DocAccessor } from '@dxos/echo-schema';
import type { YText, YXmlFragment } from '@dxos/text-model';

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
  content: string | YText | YXmlFragment | DocAccessor;

  // TODO(burdon): Move into extension.
  awareness?: YP.Awareness;

  // TODO(burdon): Remove.
  peer?: {
    id: string;
    name?: string;
  };
};

/**
 * State field makes the model available to other extensions.
 */
export const modelState = StateField.define<EditorModel | undefined>({
  create: () => undefined,
  update: (model) => model,
});
