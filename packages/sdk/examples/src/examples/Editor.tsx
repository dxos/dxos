//
// Copyright 2023 DXOS.org
//

import './Editor.css';

import React, { useEffect } from 'react';

import { Document } from '@braneframe/types';
import { MarkdownComposer, useTextModel } from '@dxos/aurora-composer';
import type { PublicKey } from '@dxos/client';
import { useQuery, useSpace } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';

const Editor = ({ spaceKey, id }: { spaceKey: PublicKey; id: number }) => {
  const identity = useIdentity();
  const space = useSpace(spaceKey);
  const [doc] = useQuery(space, Document.filter());

  const model = useTextModel({ identity, space, text: doc?.content });

  useEffect(() => {
    if (!space) {
      return;
    }

    space.db._backend.maxBatchSize = 0;
  }, [space]);

  return (
    <main className={`client client-${id}`}>
      <MarkdownComposer
        model={model}
        slots={{
          editor: {
            // TODO(wittjosiah): Copied from plugin-markdown.
            //   Without this the cursors are cut off at the edges.
            //   These should be the defaults.
            markdownTheme: {
              '&, & .cm-scroller': {
                display: 'flex',
                flexDirection: 'column',
                flex: '1 0 auto',
                inlineSize: '100%',
              },
              '& .cm-content': { flex: '1 0 auto', inlineSize: '100%', paddingBlock: '1rem' },
              '& .cm-line': { paddingInline: '1rem' },
            },
          },
        }}
      />
    </main>
  );
};

export default Editor;
