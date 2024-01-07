//
// Copyright 2024 DXOS.org
//

import * as Y from 'yjs';

import { invariant } from '@dxos/invariant';
import type { YText } from '@dxos/text-model';
import { arrayToString, stringToArray } from '@dxos/util';

import { type EditorModel, modelState, type Range, type UseTextModelProps } from './useTextModel';
import { yjs, YJSAwarenessProvider } from '../extensions';

export const createYjsModel = ({ identity, space, text }: UseTextModelProps): EditorModel => {
  invariant(text?.doc && text?.content);
  const provider = space
    ? new YJSAwarenessProvider({ space, doc: text.doc, channel: `yjs.awareness.${text.id}` })
    : undefined;

  const model: EditorModel = {
    id: text.doc.guid,
    content: text.content,
    text: () => text.content!.toString(),
    // https://github.com/yjs/yjs?tab=readme-ov-file#relative-positions
    // TODO(dmaretskyi): Refactor as cursor-converter.
    getCursorFromRange: (range: Range) => {
      const from = Y.encodeRelativePosition(Y.createRelativePositionFromTypeIndex(text.content as YText, range.from));
      const to = Y.encodeRelativePosition(Y.createRelativePositionFromTypeIndex(text.content as YText, range.to, -1));
      return [arrayToString(from), arrayToString(to)].join(':');
    },
    getRangeFromCursor: (cursor: string) => {
      invariant(text.doc);
      const parts = cursor.split(':');
      const from = Y.createAbsolutePositionFromRelativePosition(
        Y.decodeRelativePosition(stringToArray(parts[0])),
        text.doc,
      );
      const to = Y.createAbsolutePositionFromRelativePosition(
        Y.decodeRelativePosition(stringToArray(parts[1])),
        text.doc,
      );
      return from && to ? { from: from.index, to: to.index } : undefined;
    },
    extension: [modelState.init(() => model), yjs(text.content as YText, provider?.awareness)],
    awareness: provider?.awareness,
    peer: identity
      ? {
          id: identity.identityKey.toHex(),
          name: identity.profile?.displayName,
        }
      : undefined,
  };

  return model;
};
