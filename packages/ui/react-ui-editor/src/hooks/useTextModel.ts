//
// Copyright 2023 DXOS.org
//

import { StateField, type Extension } from '@codemirror/state';
import { useEffect, useState } from 'react';
import type * as Y from 'y-protocols/awareness';

import { isActualAutomergeObject, type DocAccessor, type Space, type TextObject } from '@dxos/react-client/echo';
import { type Identity } from '@dxos/react-client/halo';
import type { YText, YXmlFragment } from '@dxos/text-model';

import { createAutomergeModel, createYjsModel } from '../extensions';

/**
 * State field makes the model available to other extensions.
 */
export const modelState = StateField.define<EditorModel | undefined>({
  create: () => undefined,
  update: (model) => model,
});

export type Range = {
  from: number;
  to: number;
};

export type CommentRange = {
  id: string;
  // TODO(burdon): Split into begin/end?
  cursor: string;
};

// TODO(wittjosiah): Factor out to common package? @dxos/react-client?
export type EditorModel = {
  id: string;
  // TODO(burdon): Remove.
  content: string | YText | YXmlFragment | DocAccessor;
  text: () => string;
  /**
   * @deprecated Use CursorConverter.
   */
  getCursorFromRange?: (value: Range) => string;
  getRangeFromCursor?: (cursor: string) => Range | undefined;
  extension?: Extension;
  // TODO(burdon): Generalize.
  awareness?: Y.Awareness;
  peer?: {
    id: string;
    name?: string;
  };
};

// TODO(burdon): Remove space/identity dependency. Define interface for the framework re content and presence.
export type UseTextModelProps = {
  identity?: Identity | null;
  space?: Space;
  text?: TextObject;
};

// TODO(burdon): Remove YJS/Automerge deps (from UI component -- create abstraction; incl. all ECHO/Space deps).
// TODO(wittjosiah): Factor out to common package? @dxos/react-client?
export const useTextModel = (props: UseTextModelProps): EditorModel | undefined => {
  const { identity, space, text } = props;
  const [model, setModel] = useState<EditorModel | undefined>(() => createModel(props));
  useEffect(() => setModel(createModel(props)), [identity, space, text]);

  return model;
};

const createModel = (props: UseTextModelProps) => {
  const { text } = props;
  if (isActualAutomergeObject(text)) {
    return createAutomergeModel(props);
  } else {
    if (!text?.doc) {
      return undefined;
    }

    return createYjsModel(props);
  }
};
