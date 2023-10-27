//
// Copyright 2023 DXOS.org
//

import React, { type FC, type PropsWithChildren } from 'react';

import { mx } from '@dxos/react-ui-theme';

// TODO(burdon): Radix.
//  https://www.radix-ui.com/docs/primitives/components/toolbar
export const Toolbar: FC<PropsWithChildren> = ({ children }) => {
  return (
    <div
      className={mx(
        'flex w-full shrink-0 p-2 space-x-2 items-center h-[48px]',
        'bg-sidebar-bg dark:bg-dark-sidebar-bg',
      )}
    >
      {children}
    </div>
  );
};
