//
// Copyright 2023 DXOS.org
//

import React, { FC, ReactNode } from 'react';

import { mx } from '@dxos/react-ui-theme';
import { Address } from '@dxos/kai-types';
import { Space, TypedObject } from '@dxos/react-client/echo';

// TODO(burdon): Factor out Sections.

export type CardSlots = {
  root?: {
    className: string;
  };
};

export type CardProps<T extends TypedObject> = {
  space: Space;
  object: T;
  slots?: CardSlots;
  selected?: boolean;
  temporary?: boolean; // TODO(burdon): Enable Icon override instead.
  onSelect?: (object: T) => void;
  onAction?: (object: T) => void;
};

export const AddressSection: FC<{ address: Address }> = ({ address }) => {
  return (
    <div className='text-sm text-zinc-600'>
      <div>{address.city}</div>
      <div>
        {address.state} {address.zip}
      </div>
    </div>
  );
};

export const Card: FC<{ slots?: CardSlots; children: ReactNode }> = ({ slots = {}, children }) => {
  // TODO(burdon): Pass in sections?
  // TODO(burdon): Column constrained externally?
  return (
    <div
      className={mx(
        'flex flex-col overflow-hidden p-1 py-2 space-y-2 bg-white border-b md:border md:rounded',
        slots.root?.className,
      )}
    >
      {children}
    </div>
  );
};

export const CardRow: FC<{ children: ReactNode; className?: string; gutter?: ReactNode; action?: ReactNode }> = ({
  children,
  className,
  gutter,
  action,
}) => {
  return (
    <div className={mx('flex overflow-hidden items-center', className)}>
      <div className='flex shrink-0 w-[48px]'>{gutter}</div>
      <div className='flex w-full'>{children}</div>
      {action && <div className='flex shrink-0 w-[48px]'>{action}</div>}
    </div>
  );
};
