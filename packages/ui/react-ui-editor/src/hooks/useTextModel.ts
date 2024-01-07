//
// Copyright 2023 DXOS.org
//

import { StateField, type Extension } from '@codemirror/state';
import get from 'lodash.get';
import { useEffect, useState } from 'react';
import { yCollab } from 'y-codemirror.next';
import type * as awarenessProtocol from 'y-protocols/awareness';
import * as Y from 'yjs';

import { invariant } from '@dxos/invariant';
import {
  getRawDoc,
  isActualAutomergeObject,
  type AutomergeTextCompat,
  type DocAccessor,
  type Space,
  type TextObject,
} from '@dxos/react-client/echo';
import { type Identity } from '@dxos/react-client/halo';
import type { YText, YXmlFragment } from '@dxos/text-model';
import { arrayToString, isNotNullOrUndefined, stringToArray } from '@dxos/util';

import { NewSpaceAwarenessProvider } from './new-space-awareness-provider';
import { SpaceAwarenessProvider, cursorColor } from './yjs';
import { yjsCursorConverter } from './yjs/yjs-cursor-converter';
import { AwarenessProvider, CursorConverter, automergePlugin, awareness } from '../extensions';

// TODO(burdon): Move.
type Awareness = awarenessProtocol.Awareness;

/**
 * State field makes the model available to other extensions.
 */
// TODO(burdon): Use facet?
export const modelState = StateField.define<EditorModel | undefined>({
  create: () => undefined,
  update: (model) => model,
});

export type Range = {
  from: number;
  to: number;
};

export type CommentRange = {
  id: string;
  // TODO(burdon): Split into begin/end?
  cursor: string;
};

// TODO(wittjosiah): Factor out to common package? @dxos/react-client?
export type EditorModel = {
  id: string;
  // TODO(burdon): Remove.
  content: string | YText | YXmlFragment | DocAccessor;
  text: () => string;
  /**
   * @deprecated Use CursorConverter.
   */
  getCursorFromRange?: (value: Range) => string;
  getRangeFromCursor?: (cursor: string) => Range | undefined;
  extension?: Extension;
  awareness?: Awareness;
  peer?: {
    id: string;
    name?: string;
  };
};

// TODO(burdon): Remove space/identity dependency. Define interface for the framework re content and presence.
export type UseTextModelProps = {
  identity?: Identity | null;
  space?: Space;
  text?: TextObject;
};

// TODO(burdon): Remove YJS/Automerge deps (from UI component -- create abstraction; incl. all ECHO/Space deps).
// TODO(wittjosiah): Factor out to common package? @dxos/react-client?
export const useTextModel = (props: UseTextModelProps): EditorModel | undefined => {
  const { identity, space, text } = props;
  const [model, setModel] = useState<EditorModel | undefined>(() => createModel(props));
  useEffect(() => setModel(createModel(props)), [identity, space, text]);

  return model;
};

const createModel = (props: UseTextModelProps) => {
  const { text } = props;
  if (isActualAutomergeObject(text)) {
    return createAutomergeModel(props);
  } else {
    if (!text?.doc) {
      return undefined;
    }

    return createYjsModel(props);
  }
};

const createYjsModel = ({ identity, space, text }: UseTextModelProps): EditorModel => {
  invariant(text?.doc && text?.content);
  const provider = space
    ? new SpaceAwarenessProvider({ space, doc: text.doc, channel: `yjs.awareness.${text.id}` })
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
    extension: [
      yCollab(text.content as YText, provider?.awareness),
      CursorConverter.of(yjsCursorConverter(text.content as YText)),
      modelState.init(() => model),
    ],
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

const createAutomergeModel = ({ space, identity, text }: UseTextModelProps): EditorModel => {
  const obj = text as any as AutomergeTextCompat;
  const doc = getRawDoc(obj, [obj.field]);

  const awarenessProvider =
    space &&
    new NewSpaceAwarenessProvider({
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
      automergePlugin(doc.handle, doc.path),
      modelState.init(() => model),
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
