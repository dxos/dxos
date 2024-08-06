//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Main } from '@dxos/react-ui';
import {
  baseSurface,
  bottombarBlockPaddingEnd,
  fixedInsetFlexLayout,
  topbarBlockPaddingStart,
} from '@dxos/react-ui-theme';

import { Sheet, type SheetRootProps } from './Sheet';

const SheetMain = ({ sheet }: SheetRootProps) => {
  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart, bottombarBlockPaddingEnd]}>
      <div role='none' className='flex flex-col is-full bs-full mli-auto'>
        <Sheet.Root sheet={sheet}>
          <Sheet.Grid />
          <Sheet.StatusBar />
        </Sheet.Root>
      </div>
    </Main.Content>
  );
};

export default SheetMain;
