//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { ThreadAction } from '@dxos/plugin-thread/types';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { useAttention } from '@dxos/react-ui-attention';

import { Sketch } from './Sketch';
import { type DiagramType, type SketchSettingsProps } from '../types';

export type SketchContainerProps = {
  sketch: DiagramType;
  role: string;
  settings: SketchSettingsProps;
};

export const SketchContainer = ({ sketch, role, settings }: SketchContainerProps) => {
  const props = {
    readonly: role === 'slide',
    maxZoom: role === 'slide' ? 1.5 : undefined,
    autoZoom: role === 'section',
    grid: settings.gridType,
  };
  const id = fullyQualifiedId(sketch);
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
      classNames='attention-surface'
      onThreadCreate={onThreadCreate}
      {...props}
    />
  );
};

export default SketchContainer;
