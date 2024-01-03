//
// Copyright 2023 DXOS.org
//

import { type Extension, StateField } from '@codemirror/state';
import { type Rect } from '@codemirror/view';
import get from 'lodash.get';
import { useEffect, useState } from 'react';
import { yCollab } from 'y-codemirror.next';
import type * as awarenessProtocol from 'y-protocols/awareness';
import * as Y from 'yjs';

import { invariant } from '@dxos/invariant';
import {
  type DocAccessor,
  type Space,
  type TextObject,
  type AutomergeTextCompat,
  getRawDoc,
  isActualAutomergeObject,
} from '@dxos/react-client/echo';
import { type Identity } from '@dxos/react-client/halo';
import type { YText, YXmlFragment } from '@dxos/text-model';
import { arrayToString, stringToArray } from '@dxos/util';

import { automergePlugin } from './automerge';
import { SpaceAwarenessProvider } from './yjs';

// TODO(burdon): Move.
type Awareness = awarenessProtocol.Awareness;

/**
 * State field makes the model available to other extensions.
 */
// TODO(burdon): Use facet?
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
  relPos: string;
  location?: Rect;
} & Range;

// TODO(wittjosiah): Factor out to common package? @dxos/react-client?
export type EditorModel = {
  id: string;
  // TODO(burdon): Remove.
  content: string | YText | YXmlFragment | DocAccessor;
  text: () => string;
  comments: CommentRange[];
  getRelPos?: (value: Range) => string;
  getRange?: (value: string) => Range | undefined;
  extension?: Extension;
  awareness?: Awareness;
  peer?: {
    id: string;
    name?: string;
  };
};

// TODO(burdon): Remove space/identity dependency. Define interface for the framework re content and presence.
export type UseTextModelOptions = {
  identity?: Identity | null;
  space?: Space;
  text?: TextObject;
};

// TODO(burdon): Remove YJS/Automerge deps (from UI component -- create abstraction; incl. all ECHO/Space deps).
// TODO(wittjosiah): Factor out to common package? @dxos/react-client?
export const useTextModel = ({ identity, space, text }: UseTextModelOptions): EditorModel | undefined => {
  const [model, setModel] = useState<EditorModel | undefined>(() => createModel({ identity, space, text }));
  useEffect(() => {
    setModel(createModel({ identity, space, text }));
  }, [identity, space, text]);
  return model;
};

const createModel = (options: UseTextModelOptions) => {
  const { text } = options;
  if (isActualAutomergeObject(text)) {
    return createAutomergeModel(options);
  } else {
    if (!text?.doc) {
      return undefined;
    }

    return createYjsModel(options);
  }
};

const createYjsModel = ({ identity, space, text }: UseTextModelOptions): EditorModel => {
  invariant(text?.doc && text?.content);
  const provider = space
    ? new SpaceAwarenessProvider({ space, doc: text.doc, channel: `yjs.awareness.${text.id}` })
    : undefined;

  const model: EditorModel = {
    id: text.doc.guid,
    content: text.content,
    text: () => text.content!.toString(),
    comments: [],
    getRelPos: (value: Range) => {
      // https://github.com/yjs/yjs?tab=readme-ov-file#relative-positions
      const from = Y.encodeRelativePosition(Y.createRelativePositionFromTypeIndex(text.content as YText, value.from));
      const to = Y.encodeRelativePosition(Y.createRelativePositionFromTypeIndex(text.content as YText, value.to));
      return [arrayToString(from), arrayToString(to)].join(':');
    },
    getRange: (value: string) => {
      const parts = value.split(':');
      const from = Y.createAbsolutePositionFromRelativePosition(
        Y.decodeRelativePosition(stringToArray(parts[0])),
        text.doc!,
      );
      const to = Y.createAbsolutePositionFromRelativePosition(
        Y.decodeRelativePosition(stringToArray(parts[1])),
        text.doc!,
      );
      return { from: from!.index, to: to!.index };
    },
    extension: [yCollab(text.content as YText, provider?.awareness), modelState.init(() => model)],
    awareness: provider?.awareness,
    peer: identity
      ? {
          id: identity.identityKey.toHex(),
          name: identity.profile?.displayName,
        }
      : undefined,
  };

  return model;
};

const createAutomergeModel = ({ identity, text }: UseTextModelOptions): EditorModel => {
  const obj = text as any as AutomergeTextCompat;
  const doc = getRawDoc(obj, [obj.field]);

  const model: EditorModel = {
    id: obj.id,
    content: doc,
    text: () => get(doc.handle.docSync(), doc.path),
    comments: [],
    extension: [automergePlugin(doc.handle, doc.path), modelState.init(() => model)],
    peer: identity
      ? {
          id: identity.identityKey.toHex(),
          name: identity.profile?.displayName,
        }
      : undefined,
  };

  return model;
};
