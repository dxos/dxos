//
// Copyright 2022 DXOS.org
//

import React, { PropsWithChildren } from 'react';

export const Main = (props: PropsWithChildren<{}>) => {
  return (
    <main className='mt-8 px-8 space-y-4'>
      { props.children }
    </main>
  );
};
