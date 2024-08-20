//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { fullyQualifiedId } from '@dxos/react-client/echo';
import { Main } from '@dxos/react-ui';
import {
  baseSurface,
  bottombarBlockPaddingEnd,
  fixedInsetFlexLayout,
  topbarBlockPaddingStart,
} from '@dxos/react-ui-theme';

import { Sketch, type SketchComponentProps } from './SketchComponent';

const SketchMain = (props: SketchComponentProps) => {
  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart, bottombarBlockPaddingEnd]}>
      <Sketch
        key={fullyQualifiedId(props.sketch)} // Force instance per sketch object. Otherwise, sketch shares the same instance.
        {...props}
      />
    </Main.Content>
  );
};

export default SketchMain;
