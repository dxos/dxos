//
// Copyright 2023 DXOS.org
//

import get from 'lodash.get';
import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';

import { generateName } from '@dxos/display-name';
import { type AutomergeTextCompat, getRawDoc } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { isAutomergeObject, type Space, type TextObject } from '@dxos/react-client/echo';
import { type Identity } from '@dxos/react-client/halo';

import { SpaceAwarenessProvider } from './awareness-provider';
import { type EditorModel, modelState } from './defs';
import { automerge, awareness } from '../extensions';
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

/**
 * For use primarily in stories & tests so the dependence on TextObject can be avoided.
 * @param id
 * @param defaultContent
 */
export const useInMemoryTextModel = ({
  id,
  defaultContent,
}: {
  id: string;
  defaultContent?: string;
}): EditorModel & { setContent: Dispatch<SetStateAction<string>> } => {
  const [content, setContent] = useState(defaultContent ?? '');
  return { id, content, setContent, text: () => content };
};

const createModel = ({ space, identity, text }: UseTextModelProps) => {
  if (!text) {
    return undefined;
  }

  invariant(isAutomergeObject(text));
  const obj = text as any as AutomergeTextCompat;
  const doc = getRawDoc(obj, [obj.field]);

  const awarenessProvider =
    space &&
    new SpaceAwarenessProvider({
      space,
      channel: `automerge.awareness.${obj.id}`,
      info: {
        displayName: identity ? identity.profile?.displayName ?? generateName(identity.identityKey.toHex()) : undefined,
        color: cursorColor.color,
        lightColor: cursorColor.light,
      },
      peerId: identity?.identityKey.toHex() ?? 'Anonymous',
    });

  const extensions = [modelState.init(() => model), automerge({ handle: doc.handle, path: doc.path })];
  if (awarenessProvider) {
    extensions.push(awareness(awarenessProvider));
  }

  const model: EditorModel = {
    id: obj.id,
    content: doc,
    text: () => get(doc.handle.docSync(), doc.path),
    extension: extensions,
    peer: identity
      ? {
          id: identity.identityKey.toHex(),
          name: identity.profile?.displayName,
        }
      : undefined,
  };

  return model;
};
