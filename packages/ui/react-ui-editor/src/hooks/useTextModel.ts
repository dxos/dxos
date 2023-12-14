//
// Copyright 2023 DXOS.org
//

import { useMemo } from 'react';
import type * as awarenessProtocol from 'y-protocols/awareness';

import {
  DocAccessor,
  type Space,
  type TextObject,
  AutomergeTextCompat,
  getRawDoc,
  isActualAutomergeObject,
} from '@dxos/react-client/echo';
import { type Identity } from '@dxos/react-client/halo';
import type { YText, YXmlFragment } from '@dxos/text-model';

import { SpaceAwarenessProvider } from './yjs';

// TODO(burdon): Move.
type Awareness = awarenessProtocol.Awareness;
type Provider = { awareness: Awareness };

// TODO(wittjosiah): Factor out to common package? @dxos/react-client?
export type EditorModel = {
  id: string;
  content: string | YText | YXmlFragment | DocAccessor;
  provider?: Provider;
  peer?: {
    id: string;
    name?: string;
  };
};

export type UseTextModelOptions = {
  identity?: Identity | null;
  space?: Space;
  text?: TextObject;
};

// TODO(burdon): Don't support returning undefined (and remove checks from calling code).
// TODO(burdon): Decouple space (make Editor less dependent on entire stack)?
// TODO(wittjosiah): Factor out to common package? @dxos/react-client?
export const useTextModel = ({ identity, space, text }: UseTextModelOptions): EditorModel | undefined => {
  const provider = useMemo(() => {
    if (isActualAutomergeObject(text)) {
      return undefined;
    }

    if (!space || !text?.doc) {
      return undefined;
    }

    return new SpaceAwarenessProvider({ space, doc: text.doc, channel: `yjs.awareness.${text.id}` });
  }, [identity, space, text, text?.doc]);

  const content = useMemo(() => {
    if (isActualAutomergeObject(text)) {
      const obj = text as AutomergeTextCompat;
      return getRawDoc(obj, [obj.field]);
    } else {
      return text?.content;
    }
  }, [text]);

  if (isActualAutomergeObject(text)) {
    const obj = text as AutomergeTextCompat;
    return {
      id: obj.id,
      content: content!,
      provider: undefined,
      peer: identity
        ? {
            id: identity.identityKey.toHex(),
            name: identity.profile?.displayName,
          }
        : undefined,
    };
  }

  if (!text?.doc || !text?.content) {
    return undefined;
  }

  return {
    id: text.doc.guid,
    content: text.content,
    provider,
    peer: identity
      ? {
          id: identity.identityKey.toHex(),
          name: identity.profile?.displayName,
        }
      : undefined,
  };
};
