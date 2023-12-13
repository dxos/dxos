//
// Copyright 2023 DXOS.org
//

import { ArrowCircleUp } from '@phosphor-icons/react';
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { getSize, mx } from '@dxos/react-ui-theme';

export const onTooltip = (el: Element, url: string) => {
  const web = new URL(url);
  createRoot(el).render(
    <StrictMode>
      <div className='flex gap-1 items-center'>
        <ArrowCircleUp className={mx(getSize(6), 'text-blue-500')} />
        <p className='pr-1'>{web.origin}</p>
      </div>
    </StrictMode>,
  );
};
