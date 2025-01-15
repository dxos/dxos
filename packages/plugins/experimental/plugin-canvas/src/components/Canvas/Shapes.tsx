//
// Copyright 2024 DXOS.org
//

import React, { forwardRef, type HTMLAttributes, useCallback } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { Markers, useProjection } from '@dxos/react-ui-canvas';
import { mx } from '@dxos/react-ui-theme';

import { DEFS_ID, MARKER_PREFIX, ShapeComponent, type ShapeComponentProps } from './Shape';
import { type Layout, useEditorContext } from '../../hooks';

export type ShapesProps = ThemedClassName<{ layout: Layout }> & HTMLAttributes<HTMLDivElement>;

/**
 * Render layout.
 */
export const Shapes = forwardRef<HTMLDivElement, ShapesProps>(
  ({ classNames, layout: { shapes }, ...props }, forwardRef) => {
    const { debug, selection } = useEditorContext();
    const { styles: projectionStyles } = useProjection();

    const handleSelection = useCallback<NonNullable<ShapeComponentProps['onSelect']>>(
      (id, options) => {
        if (options?.toggle) {
          selection.toggleSelected([id], options?.shift);
        } else {
          selection.setSelected([id]);
        }
      },
      [selection],
    );

    return (
      <>
        <svg id={DEFS_ID} className='absolute opacity-0' width={0} height={0}>
          <defs>
            <Markers id={MARKER_PREFIX} />
          </defs>
        </svg>

        <div {...props} ref={forwardRef} style={projectionStyles} className={mx('absolute', classNames)}>
          {shapes.map((shape) => (
            <ShapeComponent
              key={shape.id}
              debug={debug}
              shape={shape}
              selected={selection.contains(shape.id)}
              onSelect={handleSelection}
            />
          ))}
        </div>
      </>
    );
  },
);
