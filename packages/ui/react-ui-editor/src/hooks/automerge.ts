//
// Copyright 2024 DXOS.org
//

import get from 'lodash.get';

import { type AutomergeTextCompat, getRawDoc } from '@dxos/echo-schema';
import { isNotNullOrUndefined } from '@dxos/util';

import { SpaceAwarenessProvider } from './awareness-provider';
import { type EditorModel, modelState } from './defs';
import { type UseTextModelProps } from './useTextModel';
import { automerge, awareness, AwarenessProvider } from '../extensions';
import { cursorColor } from '../styles';

export const createAutomergeModel = ({ space, identity, text }: UseTextModelProps): EditorModel => {
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
    // TODO(burdon): https://automerge.org/automerge/api-docs/js/functions/next.getCursor.html
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
