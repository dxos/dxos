//
// Copyright 2023 DXOS.org
//

import { ComponentProps, useMemo, useRef, useState } from 'react';
import * as awarenessProtocol from 'y-protocols/awareness';

import { Identity, Space, Text } from '@dxos/client';
import { useSubscription } from '@dxos/react-client';
import type { Doc, YText, YXmlFragment } from '@dxos/text-model';

import { SpaceProvider } from './yjs';

export type ComposerSlots = {
  root?: Omit<ComponentProps<'div'>, 'ref'>;
  editor?: {
    className?: string;
    spellCheck?: boolean;
    tabIndex?: number;
  };
};

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
  const prevDocRef = useRef<Doc | undefined>(text?.doc);
  const [, setState] = useState([]);
  const forceUpdate = () => setState([]);

  useSubscription(() => {
    if (prevDocRef.current !== text?.doc) {
      prevDocRef.current = text?.doc;
      forceUpdate();
    }
  }, [text]);

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
