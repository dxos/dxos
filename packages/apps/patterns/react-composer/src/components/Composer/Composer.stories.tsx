//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React, { useEffect, useReducer } from 'react';

import { PublicKey, Text } from '@dxos/client';
import { useQuery, useSpace } from '@dxos/react-client';
import { ClientSpaceDecorator } from '@dxos/react-client/testing';
import { Button, mx } from '@dxos/react-components';

import { ComposerDocument, schema } from '../../testing';
import { Composer, DocumentComposerProps } from './Composer';

export default {
  component: Composer,
  argTypes: {}
};

const Story = ({
  spaceKey,
  id,
  ...args
}: Omit<DocumentComposerProps, 'item'> & { spaceKey?: PublicKey; id?: number }) => {
  // TODO(wittjosiah): Text being created isn't firing react updates.
  const [, forceUpdate] = useReducer((state) => state + 1, 0);

  const space = useSpace(spaceKey);
  // TODO(burdon): Update on mutation?
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

  console.log({ id, spaceKey: space?.key.truncate(), docId: document?.id, content: document?.content });

  if (!document?.content) {
    return <Button onClick={() => forceUpdate()}>Update</Button>;
  }

  // TODO(burdon): Show documents for each client?
  return (
    <main className='grow p-4'>
      {document && space && (
        <Composer
          {...args}
          document={document.content}
          slots={{
            editor: {
              className: mx(
                'z-0 rounded bg-white text-neutral-900 w-full p-4 dark:bg-neutral-850 dark:text-white min-bs-[12em]',
                args.slots?.editor?.className
              )
            }
          }}
        />
      )}
    </main>
  );
};

// TODO(wittjosiah): Increasing count to 2, the second peer does not sync the document content.
export const Default = {
  render: Story,
  decorators: [ClientSpaceDecorator({ schema, count: 2 })]
};
