//
// Copyright 2023 DXOS.org
//

import type { Extension } from '@codemirror/state';
import get from 'lodash.get';
import { useMemo } from 'react';

import { generateName } from '@dxos/display-name';
import { type AutomergeTextCompat, createRawDocAccessor, type DocAccessor, getRawDoc } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { isAutomergeObject, type Space, type TextObject } from '@dxos/react-client/echo';
import { type Identity } from '@dxos/react-client/halo';
import { type HuePalette, hueTokens } from '@dxos/react-ui-theme';
import { hexToHue } from '@dxos/util';

import { automerge, awareness } from '../../extensions';
import { SpaceAwarenessProvider } from '../../hooks';

/**
 * @deprecated
 */
// TODO(burdon): Remove.
export type EditorModel = {
  id: string;
  text: () => string;
  content: string | DocAccessor;
  extension?: Extension;
};

// TODO(burdon): Remove.
type UseTextModelProps = {
  text?: TextObject;
  space?: Space;
  identity?: Identity | null;
};

/**
 * @deprecated
 */
// TODO(burdon): Remove.
export const useTextModel = (props: UseTextModelProps): EditorModel | undefined =>
  useMemo(() => createEditorModel(props), Object.values(props));

// TODO(burdon): Remove.
const createEditorModel = ({ space, identity, text }: UseTextModelProps): EditorModel | undefined => {
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
