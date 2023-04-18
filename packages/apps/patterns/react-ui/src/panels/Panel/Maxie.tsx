//
// Copyright 2023 DXOS.org
//

import React, { ReactNode, ReactElement, Children } from 'react';

import { mx } from '@dxos/react-components';

export type MaxieProps = {
  children?: ReactElement<MaxieItemProps, typeof MaxieItem>[];
};

export const Maxie = (props: MaxieProps) => {
  return (
    <div role='none' className='is-full overflow-hidden'>
      <div
        role='none'
        className={'flex flex-row'}
        style={{ inlineSize: (Children.count(props?.children) ?? 0) * 100 + '%' }}
        aria-live='polite'
      >
        {props.children}
      </div>
    </div>
  );
};

export type MaxieItemProps = {
  className?: string;
  active?: boolean;
  children?: ReactNode;
};

export const MaxieItem = (props: MaxieItemProps) => {
  const { className, active, children } = props;
  return (
    <div
      role='none'
      {...(!active && { 'aria-hidden': true })}
      className={mx('flex flex-col basis-full', active ? 'order-2' : 'order-4', className)}
    >
      <div role='region' className={mx('grow shrink-0 flex flex-col')}>
        {children}
      </div>
    </div>
  );
};
