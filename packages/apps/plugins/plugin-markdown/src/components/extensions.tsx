//
// Copyright 2023 DXOS.org
//

import { ArrowSquareOut } from '@phosphor-icons/react';
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { getSize, mx } from '@dxos/react-ui-theme';

export const onTooltip = (el: Element, url: string) => {
  const web = new URL(url);
  createRoot(el).render(
    <StrictMode>
      <a
        href={url}
        target='_blank'
        rel='noreferrer'
        className={mx(
          'rounded-sm text-base text-primary-600 hover:text-primary-500 dark:text-primary-300 hover:dark:text-primary-200',
        )}
      >
        {web.origin}
        <ArrowSquareOut weight='bold' className={mx(getSize(4), 'inline-block leading-none mis-1')} />
      </a>
    </StrictMode>,
  );
};
