//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { useOutletContext } from 'react-router-dom';

import type { Item, Space } from '@dxos/client';
// import { useSelection } from '@dxos/react-client';
import { Loading } from '@dxos/react-components';
import { Composer, DOCUMENT_TYPE } from '@dxos/react-composer';
import type { TextModel } from '@dxos/text-model';

export const SpacePage = () => {
  const { space } = useOutletContext<{ space: Space }>();

  // const [item] = useSelection<Item<TextModel>>(space?.select().filter({ type: DOCUMENT_TYPE })) ?? [];

  // return item ? (
  //   <Composer
  //     item={item}
  //     slots={{
  //       editor: {
  //         className:
  //           'z-0 rounded bg-white text-neutral-900 w-full p-4 dark:bg-neutral-850 dark:text-white min-bs-[12em]'
  //       }
  //     }}
  //   />
  // ) : (
  //   <Loading label='Loading' size='md' />
  // );
  return null
};
