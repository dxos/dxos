//
// Copyright 2023 DXOS.org
//

import './Editor.css';

import React from 'react';

import { Document } from '@braneframe/types';
import type { PublicKey } from '@dxos/client';
import { useQuery, useSpace } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { MarkdownEditor, useTextModel } from '@dxos/react-ui-editor';

const Editor = ({ spaceKey, id }: { spaceKey: PublicKey; id: number }) => {
  const identity = useIdentity();
  const space = useSpace(spaceKey);

  // TODO(dmaretskyi): Is this code still relevant?
  // useEffect(() => {
  // if (!space) {
  //   return;
  // }
  // space.db._backend.maxBatchSize = 0;
  // }, [space]);

  const [doc] = useQuery(space, Document.filter());
  const model = useTextModel({ identity, space, text: doc?.content });
  if (!model) {
    return null;
  }

  return (
    <main data-testid={`client-${id}`} className={`client client-${id}`}>
      <MarkdownEditor
        model={model}
        slots={{
          root: {
            className: 'pli-4',
          },
        }}
      />
    </main>
  );
};

export default Editor;
