//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Main } from '@dxos/react-ui';
import {
  baseSurface,
  bottombarBlockPaddingEnd,
  fixedInsetFlexLayout,
  topbarBlockPaddingStart,
} from '@dxos/react-ui-theme';

import { SketchComponent, type SketchComponentProps } from './SketchComponent';

const SketchMain = (props: SketchComponentProps) => {
  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart, bottombarBlockPaddingEnd]}>
      <SketchComponent {...props} />
    </Main.Content>
  );
};

export default SketchMain;
