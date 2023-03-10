//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import React, { useEffect, useReducer } from 'react';

import { PublicKey, Text } from '@dxos/client';
import { useQuery, useSpace } from '@dxos/react-client';
import { ClientSpaceDecorator } from '@dxos/react-client/testing';
import { Button } from '@dxos/react-components';

import { ComposerDocument, schema } from '../../testing';
import { MarkdownComposer } from './Markdown';

export default {
  component: MarkdownComposer
};

export const Default = {
  render: ({ id, spaceKey }: { id: number; spaceKey: PublicKey }) => {
    // TODO(wittjosiah): Text being created isn't firing react updates.
    const [, forceUpdate] = useReducer((state) => state + 1, 0);

    const space = useSpace(spaceKey);
    const [document] = useQuery(space, ComposerDocument.filter());

    useEffect(() => {
      if (space && id === 0) {
        setTimeout(async () => {
          // TODO(burdon): Auto-create document.
          const document = new ComposerDocument({ content: new Text() });
          await space?.db.add(document);
        });
      }
    }, [space]);

    if (!document?.content) {
      return <Button onClick={() => forceUpdate()}>Update</Button>;
    }

    return (
      <main className='flex-1 min-w-0 p-4'>
        <MarkdownComposer text={document.content} space={space} />
      </main>
    );
  },
  decorators: [ClientSpaceDecorator({ schema, count: 2 })]
};
