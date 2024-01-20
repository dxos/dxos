//
// Copyright 2023 DXOS.org
//

import { useEffect, useState } from 'react';

import { isAutomergeObject, type Space, type TextObject } from '@dxos/react-client/echo';
import { type Identity } from '@dxos/react-client/halo';

import { createAutomergeModel } from './automerge';
import { type EditorModel } from './defs';
import { createYjsModel } from './yjs';

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

const createModel = (props: UseTextModelProps) => {
  const { text } = props;
  if (isAutomergeObject(text)) {
    return createAutomergeModel(props);
  } else if (text?.doc) {
    return createYjsModel(props);
  } else {
    return undefined;
  }
};
