//
// Copyright 2023 DXOS.org
//

import React from 'react';

import type { Item } from '@dxos/client';
import { Composer, DOCUMENT_TYPE } from '@dxos/react-composer';
import { TextModel } from '@dxos/text-model';

export const COMPOSER_DOCUMENT = DOCUMENT_TYPE;

export const ComposerDocument = ({ item }: { item: Item<TextModel> }) => {
  return (
    <Composer
      item={item}
      className='z-0 rounded bg-white text-neutral-900 w-full p-4 dark:bg-neutral-850 dark:text-white min-bs-[12em]'
    />
  );
};
