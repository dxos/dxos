//
// Copyright 2026 DXOS.org
//

import { type TLCursorProps } from '@tldraw/editor';
import React from 'react';

import { RemoteCursor } from '@dxos/react-ui-attention';

/**
 * Draws a collaborator with the cursor every Composer surface uses; their presence record's `color`
 * carries the member hue.
 */
export const CollaboratorCursor = ({ className, point, zoom, color, name }: TLCursorProps) =>
  point ? (
    <RemoteCursor
      classNames={className}
      name={name ?? ''}
      hue={color ?? 'neutral'}
      x={point.x}
      y={point.y}
      zoom={zoom}
    />
  ) : null;
