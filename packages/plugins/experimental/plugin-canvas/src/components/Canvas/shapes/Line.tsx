//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { mx } from '@dxos/react-ui-theme';

import { type BaseShapeProps, DEFS_ID } from './Shape';
import { type LineShape } from '../../../types';
import { eventsAuto, eventsNone, styles } from '../../styles';
import { createUrl } from '../../svg';

export type LineProps = BaseShapeProps<LineShape>;

/**
 * Line shapes.
 */
export const Line = ({ shape, selected, onSelect }: LineProps) => {
  return (
    <div>
      <svg className={mx('absolute overflow-visible', eventsNone, styles.line, selected && styles.lineSelected)}>
        <g>
          {/* Hit area. */}
          {!shape.guide && onSelect && (
            <path
              d={shape.path}
              strokeWidth={8}
              className={mx('stroke-transparent', eventsAuto)}
              onClick={(ev) => onSelect?.(shape.id, ev.shiftKey)}
            />
          )}
          {/* This may not be necessary? */}
          <use href={`#${DEFS_ID}`} />
          <path
            d={shape.path}
            markerStart={createUrl(!shape.guide && shape.id !== 'link' && shape.start)}
            markerEnd={createUrl(!shape.guide && shape.id !== 'link' && shape.end)}
            className={mx(
              'stroke-[var(--dx-stroke-color)]',
              selected && styles.lineSelected,
              shape.guide && styles.lineGuide,
            )}
          />
        </g>
      </svg>
    </div>
  );
};
