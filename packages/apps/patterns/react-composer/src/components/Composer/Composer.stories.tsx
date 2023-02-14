//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { PublicKey } from '@dxos/client';
import { useAsyncEffect } from '@dxos/react-async';
import { useSpace } from '@dxos/react-client';
import { ClientSpaceDecorator } from '@dxos/react-client/testing';
import { Loading, mx } from '@dxos/react-components';

import { Composer, ComposerProps } from './Composer';

// TODO(wittjosiah): @dxos/log.
const log = console.log;

export default {
  component: Composer
};

const Story = ({ spaceKey, id, ...args }: Omit<ComposerProps, 'item'> & { spaceKey?: PublicKey; id?: number }) => {
  const space = useSpace(spaceKey);
  const [item] = null as any; // useSelection<Item<TextModel>>(space?.select().filter({ type: DOCUMENT_TYPE })) ?? [];

  useAsyncEffect(async () => {
    if (id === 0) {
      // await space?.database.createItem({
      //   model: TextModel,
      //   type: DOCUMENT_TYPE
      // });
    }
  }, [space]);

  return (
    <main className='grow pli-7 mbs-7'>
      {item && space ? (
        <Composer
          {...args}
          item={item}
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
};

export const Default = {
  decorators: [ClientSpaceDecorator({ count: 1 })],
  render: () => <Story />
};
