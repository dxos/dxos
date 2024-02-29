//
// Copyright 2023 DXOS.org
//

import { type Extension } from '@codemirror/state';
import get from 'lodash.get';
import { type Dispatch, type SetStateAction, useState, useMemo } from 'react';

import { generateName } from '@dxos/display-name';
import { type AutomergeTextCompat, getRawDoc } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { isAutomergeObject, type Space, type TextObject } from '@dxos/react-client/echo';
import { type Identity } from '@dxos/react-client/halo';
import { hueTokens } from '@dxos/react-ui-theme';
import { hexToHue } from '@dxos/util';

import { SpaceAwarenessProvider } from './awareness-provider';
import { type EditorModel, modelState } from './defs';
import { automerge, awareness } from '../extensions';
import { type DocAccessor } from '../extensions/automerge/defs';

export type useTextExtensionsProps = {
  id: string;
  text: DocAccessor;
  space?: Space;
  identity?: Identity;
};

// TODO(burdon): Factor out automerge defs and extension (not hook).
export const useTextExtensions = ({ id, text, space, identity }: useTextExtensionsProps): Extension[] => {
  const extensions: Extension[] = [automerge(text)];

  const peerId = identity?.identityKey.toHex();
  const { cursorLightValue, cursorDarkValue } = hueTokens[hexToHue(peerId ?? '0')];

  if (space && identity) {
    const awarenessProvider = new SpaceAwarenessProvider({
      space,
      channel: `awareness.${id}`,
      peerId: identity.identityKey.toHex(),
      info: {
        displayName: identity.profile?.displayName ?? generateName(identity.identityKey.toHex()),
        color: cursorDarkValue,
        lightColor: cursorLightValue,
      },
    });

    extensions.push(awareness(awarenessProvider));
  }

  return extensions;
};

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

  const peerId = identity?.identityKey.toHex();
  const { cursorLightValue, cursorDarkValue } = hueTokens[hexToHue(peerId ?? '0')];

  const awarenessProvider =
    space &&
    new SpaceAwarenessProvider({
      space,
      channel: `automerge.awareness.${obj.id}`,
      info: {
        displayName: identity ? identity.profile?.displayName ?? generateName(identity.identityKey.toHex()) : undefined,
        color: cursorDarkValue,
        lightColor: cursorLightValue,
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
