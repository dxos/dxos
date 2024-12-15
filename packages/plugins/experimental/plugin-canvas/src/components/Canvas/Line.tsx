//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { invariant } from '@dxos/invariant';
import { mx } from '@dxos/react-ui-theme';

import { type Shape } from '../../graph';
import { eventsAuto, eventsNone, Markers, styles } from '../styles';

// TODO(burdon): Reconcile with Frame.
export type LineProps = {
  shape: Shape;
  selected?: boolean;
  onSelect?: (id: string, shift: boolean) => void;
};

/**
 * Line shapes.
 */
export const Line = ({ shape, selected, onSelect }: LineProps) => {
  invariant(shape.type === 'line'); // TODO(burdon): ???

  return (
    <svg className={mx('absolute overflow-visible', eventsNone)}>
      <defs>
        <Markers />
      </defs>
      <g>
        {/* Hit area. */}
        <path
          d={shape.path}
          fill='none'
          strokeWidth={8}
          className={mx('stroke-transparent', eventsAuto)}
          onClick={(ev) => onSelect?.(shape.id, ev.shiftKey)}
        />
        <path
          d={shape.path}
          fill='none'
          strokeWidth={1}
          className={mx(styles.line, selected && styles.lineSelected)}
          // TODO(burdon): Edge style.
          markerStart={shape.id !== 'link' ? 'url(#circle)' : ''}
          markerEnd={shape.id !== 'link' ? 'url(#circle)' : ''}
        />
      </g>
    </svg>
  );
};
