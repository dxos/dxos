//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { mx } from '@dxos/react-ui-theme';

import { type BaseShapeProps, DEFS_ID, MARKER_PREFIX, shapeAttrs } from './Shape';
import { type LineShape } from '../../../types';
import { eventsAuto, eventsNone, styles } from '../../styles';

const createUrl = (ref: string | undefined) => (ref ? `url(#${MARKER_PREFIX}-${ref})` : undefined);

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
              fill={'none'}
              strokeWidth={8}
              className={mx('stroke-transparent', eventsAuto)}
              onClick={(ev) => onSelect?.(shape.id, ev.shiftKey)}
            />
          )}
          {/* This may not be necessary? */}
          <use href={`#${DEFS_ID}`} />
          <path
            {...shapeAttrs(shape)}
            d={shape.path}
            fill={'none'}
            markerStart={!shape.guide && shape.id !== 'link' ? createUrl(shape.start) : undefined}
            markerEnd={!shape.guide && shape.id !== 'link' ? createUrl(shape.end) : undefined}
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
