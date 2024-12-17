//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { mx } from '@dxos/react-ui-theme';

import type { BaseShapeProps } from './base';
import { eventsAuto, eventsNone, styles } from '../../styles';
import { Markers } from '../../svg';

export type LineProps = BaseShapeProps<'line'>;

/**
 * Line shapes.
 */
export const Line = ({ shape, selected, onSelect }: LineProps) => {
  return (
    <div>
      <svg className={mx('absolute overflow-visible', eventsNone, styles.line, selected && styles.lineSelected)}>
        <defs>
          <Markers />
        </defs>
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
          <path
            d={shape.path}
            stroke={'red'}
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

const createUrl = (ref?: string | false | undefined) => (ref ? `url(#${ref})` : undefined);
