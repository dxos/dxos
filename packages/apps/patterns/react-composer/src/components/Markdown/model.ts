//
// Copyright 2023 DXOS.org
//

import { useMemo, useReducer } from 'react';
import * as awarenessProtocol from 'y-protocols/awareness';
import { Doc } from 'yjs';

import { Identity, Space, Text } from '@dxos/client';
import { useSubscription } from '@dxos/react-client';
import { humanize } from '@dxos/util';

import { cursorColor, SpaceProvider } from '../../yjs';

type Awareness = awarenessProtocol.Awareness;

export type PlainTextModel = {
  id: string;
  fragment: ReturnType<Doc['getText']>;
  awareness?: Awareness;
};

export type UsePlainTextModelOptions = {
  identity?: Identity;
  space?: Space;
  text?: Text;
  field?: string;
};

export const usePlainTextModel = ({
  identity,
  space,
  text,
  field = 'utf8'
}: UsePlainTextModelOptions): PlainTextModel | undefined => {
  // TODO(wittjosiah): Support `observer` with `forwardRef`.
  const [, forceUpdate] = useReducer((state) => state + 1, 0);
  useSubscription(forceUpdate, [text]);

  const { awareness } = useMemo(() => {
    if (!space || !text?.doc) {
      return { awareness: undefined };
    }

    const provider = new SpaceProvider({ space, doc: text.doc });
    if (identity) {
      provider.awareness.setLocalStateField('user', {
        name: identity.profile?.displayName ?? humanize(identity.identityKey),
        // TODO(wittjosiah): Pick colours from theme based on identity key.
        color: cursorColor.color,
        colorLight: cursorColor.light
      });
    }

    return provider;
  }, [identity, space, text?.doc]);

  if (!text?.doc) {
    return undefined;
  }

  const fragment = text.doc.getText(field);
  return { id: text.doc.guid, fragment, awareness };
};
