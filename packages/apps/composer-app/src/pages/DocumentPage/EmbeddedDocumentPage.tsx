//
// Copyright 2023 DXOS.org
//

import React, { PropsWithChildren } from 'react';

export const EmbeddedDocumentPage = ({ children }: PropsWithChildren<{}>) => {
  return (
    <div role='none' className='min-bs-[100vh] flex flex-col p-0.5'>
      {children}
    </div>
  );
};
