//
// Copyright 2023 DXOS.org
//

import get from 'lodash.get';
import { type Dispatch, type SetStateAction, useState, useMemo } from 'react';

import { generateName } from '@dxos/display-name';
import { type AutomergeTextCompat, createRawDocAccessor, getRawDoc } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { isAutomergeObject, type Space, type TextObject } from '@dxos/react-client/echo';
import { type Identity } from '@dxos/react-client/halo';
import { type HuePalette, hueTokens } from '@dxos/react-ui-theme';
import { hexToHue } from '@dxos/util';

import { SpaceAwarenessProvider } from './awareness-provider';
import { type EditorModel } from './defs';
import { automerge, awareness } from '../extensions';

export type UseTextModelProps = {
  text?: TextObject;
  space?: Space;
  identity?: Identity | null;
};

/**
 * @deprecated
 */
// TODO(burdon): Remove once automerge lands.
export const useTextModel = (props: UseTextModelProps): EditorModel | undefined =>
  useMemo(() => createModel(props), Object.values(props));

/**
 * For use primarily in stories & tests so the dependence on TextObject can be avoided.
 * @deprecated
 */
// TODO(burdon): Remove.
export const useInMemoryTextModel = ({
  id,
  defaultContent,
}: {
  id: string;
  defaultContent?: string;
}): EditorModel & { setContent: Dispatch<SetStateAction<string>> } => {
  const [content, setContent] = useState(defaultContent ?? '');
  return { id, content, text: () => content, setContent };
};

const createModel = ({ space, identity, text }: UseTextModelProps): EditorModel | undefined => {
  if (!text) {
    return undefined;
  }

  invariant(isAutomergeObject(text));
  const obj = text as any as AutomergeTextCompat;
  const doc = getRawDoc(obj, [obj.field]);

  const peerId = identity?.identityKey.toHex();
  const { cursorLightValue, cursorDarkValue } =
    hueTokens[(identity?.profile?.data?.hue as HuePalette | undefined) ?? hexToHue(peerId ?? '0')];

  const awarenessProvider =
    space &&
    new SpaceAwarenessProvider({
      space,
      channel: `automerge.awareness.${obj.id}`,
      info: {
        displayName: identity ? identity.profile?.displayName ?? generateName(identity.identityKey.toHex()) : undefined,
        color: cursorLightValue,
        lightColor: cursorDarkValue,
      },
      peerId: identity?.identityKey.toHex() ?? 'Anonymous',
    });

  const extensions = [automerge(createRawDocAccessor({ handle: doc.handle, path: doc.path }))];
  if (awarenessProvider) {
    extensions.push(awareness(awarenessProvider));
  }

  return {
    id: obj.id,
    content: doc,
    text: () => get(doc.handle.docSync(), doc.path),
    extension: extensions,
  };
};
