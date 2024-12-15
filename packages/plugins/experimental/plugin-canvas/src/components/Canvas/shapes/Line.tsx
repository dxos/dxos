//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { mx } from '@dxos/react-ui-theme';

import { type ShapeType } from '../../../graph';
import { eventsAuto, eventsNone, Markers, styles } from '../../styles';

// TODO(burdon): Reconcile with Frame.
export type LineProps = {
  shape: ShapeType<'line'>;
  selected?: boolean;
  onSelect?: (id: string, shift: boolean) => void;
};

/**
 * Line shapes.
 */
export const Line = ({ shape, selected, onSelect }: LineProps) => {
  return (
    <svg className={mx('absolute overflow-visible', eventsNone)}>
      <defs>
        <Markers />
      </defs>
      <g>
        {/* Hit area. */}
        {!shape.guide && (
          <path
            d={shape.path}
            fill='none'
            strokeWidth={8}
            className={mx('stroke-transparent', eventsAuto)}
            onClick={(ev) => onSelect?.(shape.id, ev.shiftKey)}
          />
        )}
        <path
          d={shape.path}
          fill='none'
          strokeWidth={1}
          className={mx(styles.line, selected && styles.lineSelected, shape.guide && styles.lineGuide)}
          // TODO(burdon): Edge style.
          markerStart={!shape.guide && shape.id !== 'link' ? 'url(#circle)' : ''}
          markerEnd={!shape.guide && shape.id !== 'link' ? 'url(#circle)' : ''}
        />
      </g>
    </svg>
  );
};
