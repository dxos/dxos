//
// Copyright 2025 DXOS.org
//

import React, { type FC } from 'react';

import { Icon, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

const numbers = [
  { regular: 'ph--number-circle-zero--thin', active: 'ph--number-circle-zero--duotone' },
  { regular: 'ph--number-circle-one--thin', active: 'ph--number-circle-one--duotone' },
  { regular: 'ph--number-circle-two--thin', active: 'ph--number-circle-two--duotone' },
  { regular: 'ph--number-circle-three--thin', active: 'ph--number-circle-three--duotone' },
  { regular: 'ph--number-circle-four--thin', active: 'ph--number-circle-four--duotone' },
  { regular: 'ph--number-circle-five--thin', active: 'ph--number-circle-five--duotone' },
  { regular: 'ph--number-circle-six--thin', active: 'ph--number-circle-six--duotone' },
  { regular: 'ph--number-circle-seven--thin', active: 'ph--number-circle-seven--duotone' },
  { regular: 'ph--number-circle-eight--thin', active: 'ph--number-circle-eight--duotone' },
  { regular: 'ph--number-circle-nine--thin', active: 'ph--number-circle-nine--duotone' },
];

export type TabsProps = ThemedClassName<{ length: number; selected?: number; onSelect?: (index: number) => void }>;

// TODO(burdon): Key up/down.
export const Tabs: FC<TabsProps> = ({ classNames, length, selected = 0, onSelect }) => {
  return (
    <div
      className={mx('flex flex-col overflow-hidden outline-none', classNames)}
      tabIndex={-1}
      onKeyDown={(ev) => {
        // TODO(burdon): Focus when open Toggle.
        switch (ev.key) {
          case 'ArrowDown':
          case 'ArrowRight': {
            if (selected < length - 1) {
              onSelect?.(selected + 1);
            }
            break;
          }
          case 'ArrowUp':
          case 'ArrowLeft': {
            if (selected > 0) {
              onSelect?.(selected - 1);
            }
            break;
          }
        }
      }}
    >
      {Array.from({ length }).map((_, i) => {
        const icon = numbers[i + 1];
        return (
          <div
            key={i}
            className={mx(
              'relative flex w-[24px] h-[28px] justify-center cursor-pointer text-subdued',
              selected === i && '!text-green-500', // TODO(burdon): accent.
            )}
          >
            {i < length - 1 && <div className='absolute left-[11.5px] top-[21px] w-[1px] h-[10px] bg-neutral-400' />}
            <Icon
              icon={selected === i ? icon.regular : icon.regular}
              classNames='z-10 !p-0 !w-[24px] !h-[24px] outline-none'
              onClick={() => onSelect?.(i)}
            />
          </div>
        );
      })}
    </div>
  );
};
