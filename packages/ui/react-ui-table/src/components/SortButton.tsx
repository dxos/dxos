//
// Copyright 2024 DXOS.org
//

import { CaretUpDown, SortAscending, SortDescending } from '@phosphor-icons/react';
import { type SortDirection } from '@tanstack/react-table';
import React, { type ReactElement } from 'react';

import { Button } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

type SortButtonProps = { sortDirection: false | SortDirection; onClick: (e: any) => void };

export const SortButton = ({ sortDirection, onClick }: SortButtonProps) => {
  let icon: ReactElement;
  const size = getSize(4);

  switch (sortDirection) {
    case 'asc':
      icon = <SortAscending className={size} />;
      break;
    case 'desc':
      icon = <SortDescending className={size} />;
      break;
    default:
      icon = <CaretUpDown className={size} />;
  }

  return (
    <Button variant='ghost' onClick={onClick}>
      {icon}
    </Button>
  );
};
