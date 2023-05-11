//
// Copyright 2023 DXOS.org
//

import React, { PropsWithChildren } from 'react';

export const EmbeddedDocumentPage = ({ children }: PropsWithChildren<{}>) => {
  return (
    <div role='none' className='mli-auto max-is-[50rem] bg-white dark:bg-neutral-850/20'>
      {children}
    </div>
  );
};
