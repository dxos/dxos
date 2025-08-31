//
// Copyright 2025 DXOS.org
//

import React, { forwardRef } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export type NumericTabsProps = ThemedClassName<{
  length: number;
  selected?: number;
  onSelect?: (index: number) => void;
}>;

/**
 * @deprecated Use Timeline.
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
              className={mx(
                'relative flex w-[24px] h-[28px] justify-center cursor-pointer',
                selected !== i && 'text-subdued',
              )}
            >
              {i < length - 1 && (
                <div style={{ left: 11.5, top: 24, width: 1, height: 4 }} className='absolute bg-separator' />
              )}
              <div
                className='flex justify-center items-center w-[24px] h-[24px] border border-separator rounded-full text-xs'
                onClick={() => onSelect?.(i)}
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
