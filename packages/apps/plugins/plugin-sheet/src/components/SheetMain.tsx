//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { getSpace } from '@dxos/react-client/echo';
import { Main } from '@dxos/react-ui';
import {
  baseSurface,
  topbarBlockPaddingStart,
  fixedInsetFlexLayout,
  bottombarBlockPaddingEnd,
} from '@dxos/react-ui-theme';

import { SheetComponent } from './Sheet';
import { type SheetType } from '../types';

const SheetMain: FC<{ sheet: SheetType }> = ({ sheet }) => {
  const space = getSpace(sheet);
  if (!space) {
    return null;
  }

  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart, bottombarBlockPaddingEnd]}>
      <SheetComponent sheet={sheet} />
    </Main.Content>
  );
};

export default SheetMain;
