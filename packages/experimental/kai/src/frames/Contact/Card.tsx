//
// Copyright 2023 DXOS.org
//

import React, { FC, ReactNode } from 'react';

import { Document } from '@dxos/echo-schema';
import { Address } from '@dxos/kai-types';

// TODO(burdon): Factor out Sections.

export type CardProps<T extends Document> = {
  object: T;
  selected?: boolean;
  temporary?: boolean; // TODO(burdon): Enable Icon override instead.
  onSelect?: (object: T) => void;
  onAction?: (object: T) => void;
};

export const AddressSection: FC<{ address: Address }> = ({ address }) => {
  return (
    <div className='mt-2 text-sm text-zinc-600'>
      <div>{address.city}</div>
      <div>
        {address.state} {address.zip}
      </div>
    </div>
  );
};

export const Card: FC<{ children: ReactNode }> = ({ children }) => {
  // TODO(burdon): Pass in sections?
  // TODO(burdon): Column constrained externally?
  return (
    <div className='flex flex-col w-column overflow-hidden p-1 py-2 space-y-2 bg-white border-b md:border md:rounded-lg'>
      {children}
    </div>
  );
};

export const CardRow: FC<{ children: ReactNode; gutter?: ReactNode; action?: ReactNode }> = ({
  children,
  gutter,
  action
}) => {
  return (
    <div className='flex overflow-hidden items-center'>
      <div className='flex shrink-0 w-[48px]'>{gutter}</div>
      <div className='flex w-full'>{children}</div>
      {action && <div className='flex shrink-0 w-[48px]'>{action}</div>}
    </div>
  );
};
