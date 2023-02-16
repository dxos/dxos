//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React, { useEffect } from 'react';

import { PublicKey, TextObject } from '@dxos/client';
import { useQuery, useSpace } from '@dxos/react-client';
import { Loading, mx } from '@dxos/react-components';

import { Document, schema } from '../../testing';
import { ClientSpaceDecorator } from './ClientSpaceDecorator';
import { Composer, ComposerProps } from './Composer';

export default {
  component: Composer,
  argTypes: {}
};

export const Default = {
  render: ({ spaceKey, id, ...args }: Omit<ComposerProps, 'item'> & { spaceKey?: PublicKey; id?: number }) => {
    const space = useSpace(spaceKey);
    const [document] = useQuery(space, Document.filter());
    useEffect(() => {
      id === 0 && space?.experimental.db.save(new Document({ content: new TextObject() }));
    }, [space]);

    console.log({ document, content: document?.content });

    return (
      <main className='grow pli-7 mbs-7'>
        {document && space ? (
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
        ) : (
          <Loading label='Loading document…' />
        )}
      </main>
    );
  },
  decorators: [ClientSpaceDecorator({ schema })]
};
