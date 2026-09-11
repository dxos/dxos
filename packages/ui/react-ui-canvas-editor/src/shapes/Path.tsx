//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { mx } from '@dxos/ui-theme';

import {
  DEFS_ID,
  MARKER_PREFIX,
  type ShapeComponentProps,
  eventsAuto,
  eventsNone,
  shapeAttrs,
  styles,
} from '../components/index.ts';
import { type PathShape } from '../types/index.ts';

const createUrl = (ref: string | undefined) => (ref ? `url(#${MARKER_PREFIX}-${ref})` : undefined);

/**
 * Path shape.
 */
export const PathComponent = ({ shape, selected, onSelect }: ShapeComponentProps<PathShape>) => {
  return (
    <div>
      <svg className={mx('absolute overflow-visible', eventsNone, styles.path, selected && styles.pathSelected)}>
        <g>
          {/* Hit area. */}
          {!shape.guide && onSelect && (
            <path
              d={shape.path}
              fill={'none'}
              strokeWidth={8}
              className={mx('stroke-transparent', eventsAuto)}
              onClick={(ev) => onSelect?.(shape.id, { toggle: true, shift: ev.shiftKey })}
            />
          )}
          {/* TODO(burdon): Document if this is required. */}
          <use href={`#${DEFS_ID}`} />
          <path
            {...shapeAttrs(shape)}
            d={shape.path}
            fill={'none'}
            markerStart={!shape.guide ? createUrl(shape.start) : undefined}
            markerEnd={!shape.guide ? createUrl(shape.end) : undefined}
            className={mx(
              'stroke-[var(--dx-stroke-color)]',
              selected && styles.pathSelected,
              shape.guide && styles.pathGuide,
            )}
          />
        </g>
      </svg>
    </div>
  );
};
