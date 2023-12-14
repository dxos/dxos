//
// Copyright 2023 DXOS.org
//

import { useMemo } from 'react';
import type * as awarenessProtocol from 'y-protocols/awareness';

import { type Space, type TextObject } from '@dxos/react-client/echo';
import { type Identity } from '@dxos/react-client/halo';
import type { YText, YXmlFragment } from '@dxos/text-model';

import { SpaceAwarenessProvider } from './yjs';

// TODO(burdon): Move.
type Awareness = awarenessProtocol.Awareness;
type Provider = { awareness: Awareness };

// TODO(wittjosiah): Factor out to common package? @dxos/react-client?
export type EditorModel = {
  id: string;
  content: string | YText | YXmlFragment;
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
// TODO(wittjosiah): Factor out to common package? @dxos/react-client?
// TODO(burdon): Decouple space (make Editor less dependent on entire stack)?
export const useTextModel = ({ identity, space, text }: UseTextModelOptions): EditorModel | undefined => {
  const provider = useMemo(() => {
    if (!space || !text?.doc) {
      return undefined;
    }

    return new SpaceAwarenessProvider({ space, doc: text.doc, channel: `yjs.awareness.${text.id}` });
  }, [identity, space, text?.doc]);

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
