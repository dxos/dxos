//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { mx } from '@dxos/react-ui-theme';

import { type ShapeType } from '../../../graph';
import { Markers } from '../../markers';
import { eventsAuto, eventsNone, styles } from '../../styles';

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
    <div>
      <svg
        className={mx('absolute overflow-visible', eventsNone)}
        style={
          {
            // ...({ '--dx-marker-fill': 'bg-blue-500' } as any),
          }
        }
      >
        <defs>
          <Markers />
        </defs>
        <g>
          {/* Hit area. */}
          {!shape.guide && (
            <path
              d={shape.path}
              strokeWidth={8}
              className={mx('stroke-transparent', eventsAuto)}
              onClick={(ev) => onSelect?.(shape.id, ev.shiftKey)}
            />
          )}
          <path
            d={shape.path}
            className={mx(styles.line, selected && styles.lineSelected, shape.guide && styles.lineGuide)}
            markerStart={createUrl(!shape.guide && shape.id !== 'link' && shape.start)}
            markerEnd={createUrl(!shape.guide && shape.id !== 'link' && shape.end)}
          />
        </g>
      </svg>
    </div>
  );
};

const createUrl = (ref?: string | false | undefined) => (ref ? `url(#${ref})` : undefined);
