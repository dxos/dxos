//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { useIntentDispatcher } from '@dxos/app-framework';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { useAttendableAttributes, useAttention } from '@dxos/react-ui-attention';

import { Sketch, type SketchProps } from './Sketch';

// TODO(burdon): Standardize plugin component containers.
const SketchContainer = ({ classNames, sketch, ...props }: SketchProps) => {
  const id = fullyQualifiedId(sketch);
  const attentionAttrs = useAttendableAttributes(id);
  const { hasAttention } = useAttention(id);
  const dispatch = useIntentDispatcher();

  const onThreadCreate = useCallback(() => {
    void dispatch({
      // TODO(Zan): We shouldn't hardcode the action ID.
      action: 'dxos.org/plugin/thread/action/create',
      data: {
        subject: sketch,
        cursor: Date.now().toString(), // TODO(Zan): Consider a more appropriate anchor format.
      },
    });
  }, [dispatch, sketch]);

  // NOTE: Min 500px height (for tools palette to be visible).
  return (
    <Sketch
      // Force instance per sketch object. Otherwise, sketch shares the same instance.
      key={id}
      sketch={sketch}
      hideUi={!hasAttention}
      classNames={[classNames, 'attention-surface']}
      onThreadCreate={onThreadCreate}
      {...attentionAttrs}
      {...props}
    />
  );
};

export default SketchContainer;
