//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Main } from '@dxos/react-ui';
import {
  baseSurface,
  fixedInsetFlexLayout,
  topbarBlockPaddingStart,
  bottombarBlockPaddingEnd,
} from '@dxos/react-ui-theme';

import { Chess } from './Chess';

const ChessMain: React.FC<React.ComponentProps<typeof Chess>> = (props) => {
  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart, bottombarBlockPaddingEnd]}>
      <Chess {...props} />
    </Main.Content>
  );
};

export default ChessMain;
