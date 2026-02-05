//
// Copyright 2025 DXOS.org
//

import React, { forwardRef } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

const diameter = 24;
const connector = 0;
// const connector = 4;

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
              className='relative flex justify-center cursor-pointer'
              style={{ width: diameter, height: diameter + connector }}
            >
              {connector > 0 && i < length - 1 && (
                <div
                  style={{ left: (diameter - 1) / 2, top: diameter, width: 2, height: connector }}
                  className='absolute border-l border-groupSurface'
                />
              )}
              <div
                className={mx(
                  'flex justify-center items-center text-xs bg-groupSurface hover:bg-hoverSurface',
                  selected === i ? 'bg-inputSurface' : 'text-subdued',
                  connector && 'rounded-full',
                )}
                style={{ width: diameter, height: diameter }}
                onClick={() => {
                  onSelect?.(i);
                }}
              >
                {i + 1}
              </div>
            </div>
          );
        })}
      </div>
    );
  },
);
