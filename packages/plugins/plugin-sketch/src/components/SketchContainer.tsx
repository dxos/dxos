//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { ThreadAction } from '@dxos/plugin-thread/types';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { useAttention } from '@dxos/react-ui-attention';
import { StackItem } from '@dxos/react-ui-stack';

import { Sketch } from './Sketch';
import { type DiagramType, type SketchSettingsProps } from '../types';

export type SketchContainerProps = {
  role: string;
  sketch: DiagramType;
  settings: SketchSettingsProps;
};

export const SketchContainer = ({ role, sketch, settings }: SketchContainerProps) => {
  const id = fullyQualifiedId(sketch);
  const { hasAttention } = useAttention(id);
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  const props = {
    readonly: role === 'slide',
    autoZoom: role === 'section' ? true : undefined,
    maxZoom: role === 'slide' ? 1.5 : undefined,
  };

  const handleThreadCreate = useCallback(() => {
    // TODO(Zan): Consider a more appropriate anchor format.
    void dispatch(createIntent(ThreadAction.Create, { subject: sketch, cursor: Date.now().toString() }));
  }, [dispatch, sketch]);

  return (
    // NOTE: Min 500px height (for tools palette to be visible).
    <StackItem.Content toolbar={false} size={role === 'section' ? 'square' : 'intrinsic'} classNames='min-bs-[32rem]'>
      <Sketch
        // Force instance per sketch object. Otherwise, sketch shares the same instance.
        key={id}
        classNames='attention-surface'
        sketch={sketch}
        hideUi={!hasAttention}
        settings={settings}
        onThreadCreate={handleThreadCreate}
        {...props}
      />
    </StackItem.Content>
  );
};

export default SketchContainer;
