//
// Copyright 2023 DXOS.org
//

import { type Extension, StateField } from '@codemirror/state';
import get from 'lodash.get';
import { useEffect, useState } from 'react';
import { yCollab } from 'y-codemirror.next';
import type * as awarenessProtocol from 'y-protocols/awareness';
import * as Y from 'yjs';

import { invariant } from '@dxos/invariant';
import {
  type DocAccessor,
  type Space,
  type TextObject,
  type AutomergeTextCompat,
  getRawDoc,
  isActualAutomergeObject,
} from '@dxos/react-client/echo';
import { type Identity } from '@dxos/react-client/halo';
import type { YText, YXmlFragment } from '@dxos/text-model';
import { arrayToString, isNotNullOrUndefined, stringToArray } from '@dxos/util';

import { automergePlugin } from './automerge';
import { SpaceAwarenessProvider } from './yjs';
import { NewSpaceAwarenessProvider } from './new-space-awareness-provider';
import { AwarenessProvider } from '../components/TextEditor/extensions/awareness';

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
  getCursorFromRange?: (value: Range) => string;
  getRangeFromCursor?: (cursor: string) => Range;
  extension?: Extension;
  awareness?: Awareness;
  newAwareness?: NewSpaceAwarenessProvider;
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

  // TODO(dmaretskyi): Find a better way to handle this lifecycle.
  useEffect(() => {
    if(model?.newAwareness instanceof NewSpaceAwarenessProvider) {
      model.newAwareness.open();

      return () => {
        model.newAwareness!.close();
      }
    }
  }, [model?.newAwareness])

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
      const parts = cursor.split(':');
      const from = Y.createAbsolutePositionFromRelativePosition(
        Y.decodeRelativePosition(stringToArray(parts[0])),
        text.doc!,
      );
      const to = Y.createAbsolutePositionFromRelativePosition(
        Y.decodeRelativePosition(stringToArray(parts[1])),
        text.doc!,
      );
      return { from: from!.index, to: to!.index };
    },
    extension: [yCollab(text.content as YText, provider?.awareness), modelState.init(() => model)],
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

  const awareness = space && new NewSpaceAwarenessProvider({
    space,
    channel: `automerge.awareness.${obj.id}`,
    peerId: identity?.identityKey.toHex() ?? 'Anonymous',
    displayName: identity?.profile?.displayName ?? '',
    color: 'red',
  });
  console.log({ awareness })
  const model: EditorModel = {
    id: obj.id,
    content: doc,
    text: () => get(doc.handle.docSync(), doc.path),
    // TODO(burdon): https://automerge.org/automerge/api-docs/js/functions/next.getCursor.html
    extension: [
      automergePlugin(doc.handle, doc.path),
      modelState.init(() => model),
      awareness && AwarenessProvider.of(awareness)
    ].filter(isNotNullOrUndefined),
    newAwareness: awareness,
    peer: identity
      ? {
          id: identity.identityKey.toHex(),
          name: identity.profile?.displayName,
        }
      : undefined,
  };

  return model;
};
