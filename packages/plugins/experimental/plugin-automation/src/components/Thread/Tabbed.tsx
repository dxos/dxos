//
// Copyright 2025 DXOS.org
//

import React, { type FC } from 'react';

import { Icon, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

const numbers = [
  { regular: 'ph--number-circle-zero--regular', active: 'ph--number-circle-zero--duotone' },
  { regular: 'ph--number-circle-one--regular', active: 'ph--number-circle-one--duotone' },
  { regular: 'ph--number-circle-two--regular', active: 'ph--number-circle-two--duotone' },
  { regular: 'ph--number-circle-three--regular', active: 'ph--number-circle-three--duotone' },
  { regular: 'ph--number-circle-four--regular', active: 'ph--number-circle-four--duotone' },
  { regular: 'ph--number-circle-five--regular', active: 'ph--number-circle-five--duotone' },
  { regular: 'ph--number-circle-six--regular', active: 'ph--number-circle-six--duotone' },
  { regular: 'ph--number-circle-seven--regular', active: 'ph--number-circle-seven--duotone' },
  { regular: 'ph--number-circle-eight--regular', active: 'ph--number-circle-eight--duotone' },
  { regular: 'ph--number-circle-nine--regular', active: 'ph--number-circle-nine--duotone' },
];

export type TabsProps = ThemedClassName<{ length: number; selected?: number; onSelect?: (index: number) => void }>;

// TODO(burdon): Key up/down.
export const Tabs: FC<TabsProps> = ({ classNames, length, selected = 0, onSelect }) => {
  return (
    <div className={mx('flex flex-col', classNames)}>
      {Array.from({ length }).map((_, i) => {
        const icon = numbers[i + 1];
        return (
          <div
            key={i}
            className={mx(
              'flex w-[24px] h-[24px] items-center justify-center cursor-pointer',
              'hover:bg-neutral-300 dark:hover:bg-neutral-700 text-subdued',
              selected === i && '!_bg-primary-500 !text-primary-500',
            )}
            onClick={() => onSelect?.(i)}
          >
            <Icon icon={selected === i ? icon.regular : icon.regular} size={5} classNames='!p-0' />
          </div>
        );
      })}
    </div>
  );
};
