//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { fullyQualifiedId } from '@dxos/react-client/echo';
import { useHasAttention } from '@dxos/react-ui-attention';

import { Sketch, type SketchProps } from './Sketch';

// TODO(burdon): Standardize plugin component containers.
const SketchContainer = ({ classNames, sketch, ...props }: SketchProps) => {
  const id = fullyQualifiedId(sketch);
  const hasAttention = useHasAttention(id);

  // NOTE: Min 500px height (for tools palette to be visible).
  return (
    <Sketch
      // Force instance per sketch object. Otherwise, sketch shares the same instance.
      key={id}
      sketch={sketch}
      hideUi={!hasAttention}
      // TODO(burdon): Factor out fragment.
      classNames={[classNames, hasAttention && 'bg-[--surface-bg] attention-static']}
      {...props}
    />
  );
};

export default SketchContainer;
