//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { ThreadAction } from '@dxos/plugin-thread/types';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { useAttendableAttributes, useAttention } from '@dxos/react-ui-attention';

import { Sketch, type SketchProps } from './Sketch';

// TODO(burdon): Standardize plugin component containers.
const SketchContainer = ({ classNames, sketch, ...props }: SketchProps) => {
  const id = fullyQualifiedId(sketch);
  const attentionAttrs = useAttendableAttributes(id);
  const { hasAttention } = useAttention(id);
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  const onThreadCreate = useCallback(() => {
    // TODO(Zan): Consider a more appropriate anchor format.
    void dispatch(createIntent(ThreadAction.Create, { subject: sketch, cursor: Date.now().toString() }));
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
