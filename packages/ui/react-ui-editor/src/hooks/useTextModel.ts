//
// Copyright 2023 DXOS.org
//

import get from 'lodash.get';
import { useEffect, useState } from 'react';

import { type AutomergeTextCompat, getRawDoc } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { isAutomergeObject, type Space, type TextObject } from '@dxos/react-client/echo';
import { type Identity } from '@dxos/react-client/halo';
import { isNotNullOrUndefined } from '@dxos/util';

import { SpaceAwarenessProvider } from './awareness-provider';
import { type EditorModel, modelState } from './defs';
import { automerge, awareness, AwarenessProvider } from '../extensions';
import { cursorColor } from '../styles';

// TODO(burdon): Remove space/identity dependency. Define interface for the framework re content and presence.
export type UseTextModelProps = {
  identity?: Identity | null;
  space?: Space;
  text?: TextObject;
};

export const useTextModel = (props: UseTextModelProps): EditorModel | undefined => {
  const { identity, space, text } = props;
  const [model, setModel] = useState<EditorModel | undefined>();
  useEffect(() => setModel(createModel(props)), [identity, space, text]);
  return model;
};

const createModel = ({ space, identity, text }: UseTextModelProps) => {
  invariant(isAutomergeObject(text));
  const obj = text as any as AutomergeTextCompat;
  const doc = getRawDoc(obj, [obj.field]);

  const awarenessProvider =
    space &&
    new SpaceAwarenessProvider({
      space,
      channel: `automerge.awareness.${obj.id}`,
      info: {
        displayName: identity?.profile?.displayName ?? '',
        color: cursorColor.color,
        lightColor: cursorColor.light,
      },
      peerId: identity?.identityKey.toHex() ?? 'Anonymous',
    });

  const model: EditorModel = {
    id: obj.id,
    content: doc,
    text: () => get(doc.handle.docSync(), doc.path),
    extension: [
      modelState.init(() => model),
      automerge({ handle: doc.handle, path: doc.path }),
      awarenessProvider && AwarenessProvider.of(awarenessProvider),
      awareness(),
    ].filter(isNotNullOrUndefined),
    peer: identity
      ? {
          id: identity.identityKey.toHex(),
          name: identity.profile?.displayName,
        }
      : undefined,
  };

  return model;
};
