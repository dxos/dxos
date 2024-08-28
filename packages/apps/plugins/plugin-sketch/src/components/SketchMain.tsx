//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { fullyQualifiedId } from '@dxos/react-client/echo';
import { useHasAttention } from '@dxos/react-ui-attention';

import { Sketch, type SketchComponentProps } from './SketchComponent';

// TODO(burdon): Factor out generic container that deals with attention, borders, etc?
const SketchMain = (props: SketchComponentProps) => {
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

export default SketchMain;
