//
// Copyright 2023 DXOS.org
//

import { type Extension } from '@codemirror/state';
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

import { automergePlugin } from './automerge';
import { SpaceAwarenessProvider } from './yjs';

// TODO(burdon): Move.
type Awareness = awarenessProtocol.Awareness;

export type Range = {
  from: number;
  to: number;
};

export type DocumentRange = {
  id: string;
} & Range;

// TODO(wittjosiah): Factor out to common package? @dxos/react-client?
export type EditorModel = {
  id: string;
  // TODO(burdon): Remove.
  content: string | YText | YXmlFragment | DocAccessor;
  text: () => string;
  ranges: DocumentRange[];
  // TODO(burdon): Move into extension?
  getRelative?: (value: Range) => Uint8Array;
  getAbsolute?: (value: Uint8Array) => Range | undefined;
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

  return {
    id: text.doc.guid,
    content: text.content,
    text: () => text.content!.toString(),
    ranges: [],
    getRelative: (value: Range) => {
      return Y.encodeRelativePosition(
        Y.createRelativePositionFromTypeIndex(text.content as YText, value.from, value.to),
      );
    },
    getAbsolute: (value: Uint8Array) => {
      const x = Y.createAbsolutePositionFromRelativePosition(Y.decodeRelativePosition(value), text.doc!);
      return x ? { from: x.index!, to: x.assoc ?? x.index } : undefined;
    },
    extension: yCollab(text.content as YText, provider?.awareness),
    awareness: provider?.awareness,
    peer: identity
      ? {
          id: identity.identityKey.toHex(),
          name: identity.profile?.displayName,
        }
      : undefined,
  };
};

const createAutomergeModel = ({ identity, text }: UseTextModelOptions): EditorModel => {
  const obj = text as any as AutomergeTextCompat;
  const doc = getRawDoc(obj, [obj.field]);

  return {
    id: obj.id,
    content: doc,
    text: () => get(doc.handle.docSync(), doc.path),
    ranges: [],
    extension: automergePlugin(doc.handle, doc.path),
    peer: identity
      ? {
          id: identity.identityKey.toHex(),
          name: identity.profile?.displayName,
        }
      : undefined,
  };
};
