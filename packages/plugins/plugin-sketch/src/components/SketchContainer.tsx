//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { useIntentDispatcher } from '@dxos/app-framework';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { useAttendableAttributes, useAttention } from '@dxos/react-ui-attention';
import { StackItem } from '@dxos/react-ui-stack';

import { Sketch } from './Sketch';
import { type DiagramType, type SketchGridType } from '../types';

const SketchContainer = ({ sketch, role, grid }: { sketch: DiagramType; role: string; grid?: SketchGridType }) => {
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
        // TODO(Zan): Consider a more appropriate anchor format.
        cursor: Date.now().toString(),
      },
    });
  }, [dispatch, sketch]);

  // NOTE: Min 500px height (for tools palette to be visible).
  return (
    <StackItem.Content
      toolbar={false}
      role={role}
      classNames={['relative', role === 'article' ? false : role === 'section' ? 'aspect-square' : 'p-16']}
    >
      <Sketch
        // Force instance per sketch object. Otherwise, sketch shares the same instance.
        key={id}
        sketch={sketch}
        grid={grid}
        hideUi={!hasAttention}
        classNames='attention-surface'
        onThreadCreate={onThreadCreate}
        readonly={role === 'slide'}
        maxZoom={role === 'slide' ? 1.5 : undefined}
        autoZoom={role === 'section'}
        {...attentionAttrs}
      />
    </StackItem.Content>
  );
};

export default SketchContainer;
