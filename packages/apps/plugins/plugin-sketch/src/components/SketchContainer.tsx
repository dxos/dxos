//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { fullyQualifiedId } from '@dxos/react-client/echo';
import { useHasAttention } from '@dxos/react-ui-attention';

import { Sketch, type SketchProps } from './Sketch';

const SketchContainer = (props: SketchProps) => {
  const attended = useHasAttention(fullyQualifiedId(props.sketch));

  return (
    <Sketch
      // Force instance per sketch object. Otherwise, sketch shares the same instance.
      key={fullyQualifiedId(props.sketch)}
      hideUi={!attended}
      {...props}
    />
  );
};

export default SketchContainer;
