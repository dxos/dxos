//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { fullyQualifiedId } from '@dxos/react-client/echo';
import { Main } from '@dxos/react-ui';
import {
  baseSurface,
  bottombarBlockPaddingEnd,
  fixedInsetFlexLayout,
  topbarBlockPaddingStart,
} from '@dxos/react-ui-theme';

import SketchComponent, { type SketchComponentProps } from './SketchComponent';

const SketchMain: FC<SketchComponentProps> = (props) => {
  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart, bottombarBlockPaddingEnd]}>
      <SketchComponent
        key={fullyQualifiedId(props.sketch)} // Force instance per sketch object. Otherwise, sketch shares the same instance.
        {...props}
      />
    </Main.Content>
  );
};

export default SketchMain;
