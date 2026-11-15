//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import type * as Drawing from '@dxos/plugin-illustrator/Drawing';
import { AttendableContainer } from '@dxos/react-ui-attention';

/** The open diagram in the canvas article, filling the viewport. */
export const DrawingView = ({ drawing }: { drawing: Drawing.Drawing }) => (
  <AttendableContainer id={drawing.id} classNames='dx-grow grid'>
    <Surface.Surface
      key={drawing.id}
      type={AppSurface.Article}
      data={{ subject: drawing, attendableId: drawing.id }}
      limit={1}
    />
  </AttendableContainer>
);
