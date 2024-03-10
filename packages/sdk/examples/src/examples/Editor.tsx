//
// Copyright 2023 DXOS.org
//

import './Editor.css';

import React from 'react';

import { Document } from '@braneframe/types';
import type { PublicKey } from '@dxos/client';
import { useQuery, useSpace } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import {
  createBasicExtensions,
  createDataExtensions,
  createThemeExtensions,
  useDocAccessor,
  useTextEditor,
} from '@dxos/react-ui-editor';

const Editor = ({ spaceKey, id }: { spaceKey: PublicKey; id: number }) => {
  const identity = useIdentity();
  const space = useSpace(spaceKey);

  const [item] = useQuery(space, Document.filter());
  const { doc, accessor } = useDocAccessor(item?.content);
  const { parentRef } = useTextEditor({
    doc,
    extensions: [
      createBasicExtensions(),
      createThemeExtensions(),
      createDataExtensions({ id: item?.id, text: accessor, space, identity }),
    ],
  });

  return (
    <main data-testid={`client-${id}`} className={`client client-${id}`}>
      <div ref={parentRef} className='pli-4' />
    </main>
  );
};

export default Editor;
