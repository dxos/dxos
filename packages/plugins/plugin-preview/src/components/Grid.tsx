//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Button, Icon } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export const gridRow = 'is-full grid grid-cols-[1.5rem_1fr_min-content] gap-2 items-center';

export const GridRow = ({ icon, label, onClick }: { icon: string; label: string; onClick?: () => void }) => {
  if (!onClick) {
    return (
      <p className={mx(gridRow, 'dx-button')} data-variant='ghost'>
        <Icon icon={icon} size={5} classNames='text-subdued' />
        <span className='min-is-0 flex-1 truncate col-span-2'>{label}</span>
      </p>
    );
  }

  return (
    <Button variant='ghost' classNames={mx(gridRow, 'text-start')} onClick={onClick}>
      <Icon icon={icon} size={5} classNames='text-subdued' />
      <span className='min-is-0 flex-1 truncate'>{label}</span>
      <Icon icon='ph--arrow-right--regular' />
    </Button>
  );
};
