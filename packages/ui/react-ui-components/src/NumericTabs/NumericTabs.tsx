//
// Copyright 2025 DXOS.org
//

import React, { forwardRef } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

const diameter = 24;
const connector = 4;

export type NumericTabsProps = ThemedClassName<{
  length: number;
  selected?: number;
  onSelect?: (index: number) => void;
}>;

/**
 * Vertical strip of nodes.
 */
export const NumericTabs = forwardRef<HTMLDivElement, NumericTabsProps>(
  ({ classNames, length, selected = 0, onSelect }, forwardedRef) => {
    return (
      <div
        ref={forwardedRef}
        className={mx('flex flex-col overflow-hidden outline-none', classNames)}
        tabIndex={-1}
        onKeyDown={(ev) => {
          // TODO(burdon): Focus when open Toggle.
          switch (ev.key) {
            case 'ArrowDown':
            case 'ArrowRight': {
              ev.preventDefault();
              ev.stopPropagation();
              if (selected < length - 1) {
                onSelect?.(selected + 1);
              }
              break;
            }
            case 'ArrowUp':
            case 'ArrowLeft': {
              ev.preventDefault();
              ev.stopPropagation();
              if (selected > 0) {
                onSelect?.(selected - 1);
              }
              break;
            }

            case 'Enter': {
              ev.preventDefault();
              ev.stopPropagation();
              onSelect?.(selected);
              break;
            }
          }
        }}
      >
        {Array.from({ length }).map((_, i) => {
          return (
            <div
              key={i}
              className={mx('relative flex justify-center cursor-pointer', selected !== i && 'text-subdued')}
              style={{ width: diameter, height: diameter + connector }}
            >
              {i < length - 1 && (
                <div
                  style={{ left: 11.5, top: diameter, width: 1, height: connector }}
                  className='absolute bg-separator'
                />
              )}
              <div
                className='flex justify-center items-center border border-separator rounded-full text-xs'
                style={{ width: diameter, height: diameter }}
                onClick={() => {
                  onSelect?.(i);
                }}
              >
                {i}
              </div>
            </div>
          );
        })}
      </div>
    );
  },
);
