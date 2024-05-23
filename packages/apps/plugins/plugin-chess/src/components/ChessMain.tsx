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
      <div role='none' className='flex flex-col justify-center is-full bs-full max-is-[640px] mli-auto'>
        <Chess {...props} />
      </div>
    </Main.Content>
  );
};

export default ChessMain;
