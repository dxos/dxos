//
// Copyright 2023 DXOS.org
//

import { useMemo, useReducer } from 'react';
import * as awarenessProtocol from 'y-protocols/awareness';

import { Identity, Space, Text } from '@dxos/client';
import { useSubscription } from '@dxos/react-client';
import type { YText, YXmlFragment } from '@dxos/text-model';

import { SpaceProvider } from './yjs';

type Awareness = awarenessProtocol.Awareness;
type Provider = { awareness: Awareness };

// TODO(wittjosiah): Factor out to common package? @dxos/react-client?
export type ComposerModel = {
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
  text?: Text;
};

// TODO(wittjosiah): Factor out to common package? @dxos/react-client?
export const useTextModel = ({ identity, space, text }: UseTextModelOptions): ComposerModel | undefined => {
  // TODO(wittjosiah): Support `observer` with `forwardRef`.
  const [, forceUpdate] = useReducer((state) => state + 1, 0);
  useSubscription(forceUpdate, [text]);

  const provider = useMemo(() => {
    if (!space || !text?.doc) {
      return undefined;
    }

    return new SpaceProvider({ space, doc: text.doc });
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
          name: identity.profile?.displayName
        }
      : undefined
  };
};
