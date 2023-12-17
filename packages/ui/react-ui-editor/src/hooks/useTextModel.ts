//
// Copyright 2023 DXOS.org
//

import { type Extension } from '@codemirror/state';
import get from 'lodash.get';
import { useEffect, useState } from 'react';
import { yCollab } from 'y-codemirror.next';
import type * as awarenessProtocol from 'y-protocols/awareness';

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
type Provider = { awareness: Awareness };

// TODO(wittjosiah): Factor out to common package? @dxos/react-client?
export type EditorModel = {
  id: string;
  content: string | YText | YXmlFragment | DocAccessor;
  text: () => string;
  extension?: Extension;
  provider?: Provider;
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

const createYjsModel = ({ identity, space, text }: UseTextModelOptions): EditorModel => {
  invariant(space && text?.doc && text?.content);
  const provider = new SpaceAwarenessProvider({ space, doc: text.doc, channel: `yjs.awareness.${text.id}` });

  return {
    id: text.doc.guid,
    content: text.content,
    text: () => text.content!.toString(),
    extension: yCollab(text.content as YText, provider.awareness),
    provider,
    peer: identity
      ? {
          id: identity.identityKey.toHex(),
          name: identity.profile?.displayName,
        }
      : undefined,
  };
};

const createAutomergeModel = ({ identity, space, text }: UseTextModelOptions): EditorModel => {
  invariant(space && text?.doc && text?.content);
  const obj = text as any as AutomergeTextCompat;
  const doc = getRawDoc(obj, [obj.field]);

  return {
    id: obj.id,
    content: doc,
    text: () => get(doc.handle.docSync(), doc.path),
    extension: automergePlugin(doc.handle, doc.path),
    peer: identity
      ? {
          id: identity.identityKey.toHex(),
          name: identity.profile?.displayName,
        }
      : undefined,
  };
};

const createModel = (options: UseTextModelOptions) => {
  const { space, text } = options;
  if (!space || !text?.doc || !text?.content) {
    return undefined;
  }

  if (isActualAutomergeObject(text)) {
    return createAutomergeModel(options);
  } else {
    return createYjsModel(options);
  }
};

// TODO(burdon): Don't support returning undefined (and remove checks from calling code).
// TODO(burdon): Decouple space (make Editor less dependent on entire stack)?
// TODO(wittjosiah): Factor out to common package? @dxos/react-client?
export const useTextModel = ({ identity, space, text }: UseTextModelOptions): EditorModel | undefined => {
  const [model, setModel] = useState<EditorModel | undefined>(() => createModel({ identity, space, text }));
  useEffect(() => {
    setModel(createModel({ identity, space, text }));
  }, [identity, space, text]);
  return model;
};
