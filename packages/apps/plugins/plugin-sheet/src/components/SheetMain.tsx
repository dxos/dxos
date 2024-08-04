//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Main } from '@dxos/react-ui';
import {
  baseSurface,
  topbarBlockPaddingStart,
  fixedInsetFlexLayout,
  bottombarBlockPaddingEnd,
} from '@dxos/react-ui-theme';

import { Sheet, type SheetRootProps } from './Sheet';

const SheetMain = ({ sheet }: SheetRootProps) => {
  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart, bottombarBlockPaddingEnd]}>
      <Sheet.Root sheet={sheet}>
        <Sheet.Grid />
        <Sheet.StatusBar />
      </Sheet.Root>
    </Main.Content>
  );
};

export default SheetMain;
