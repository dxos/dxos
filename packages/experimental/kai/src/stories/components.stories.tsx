//
// Copyright 2023 DXOS.org
//

import { Bug } from 'phosphor-react';
import React, { FC, ReactNode } from 'react';

import { getSize, mx } from '@dxos/react-components';

const Frame: FC<{ children: ReactNode; className?: string }> = ({ children, className }) => {
  return <div className={mx('flex flex-col absolute top-0 bottom-0 left-0 right-0', className)}>{children}</div>;
};

export default {
  component: Frame
};

const Stripe: FC<{ compact?: boolean; length?: number; row?: number }> = ({ compact, length = 16, row = 0 }) => {
  const classNames = compact ? 'w-[32px] h-[32px]' : 'w-[40px] h-[40px]';
  return (
    <div className='flex w-full items-center'>
      {Array.from({ length }).map((_, i) => (
        <div key={i} className={mx('flex ', classNames, (i + row) % 2 === 0 ? ' bg-slate-100' : 'bg-slate-200')} />
      ))}
    </div>
  );
};

const IconButton: FC<{ className?: string }> = ({ className }) => (
  <button className='flex shrink-0 justify-center items-center w-[40px] h-[40px] bg-slate-400'>
    <Bug className={getSize(6)} />
  </button>
);

const Checkbox: FC<{ className?: string }> = ({ className }) => (
  <div className='flex shrink-0 justify-center items-center w-[40px] h-[40px] bg-slate-400'>
    <input type='checkbox' />
  </div>
);

const Input: FC<{ className?: string }> = ({ className }) => (
  <input type='text' autoFocus className={mx('flex shrink-0 leading-4 p-2', className)} />
);

const Select: FC<{ className?: string }> = ({ className }) => (
  <select className={mx('flex shrink-0 leading-4 p-2.5', className)}>
    <option>1</option>
    <option>2</option>
    <option>3</option>
  </select>
);

export const Controls = () => {
  return (
    <Frame>
      <div className='flex flex-col m-4'>
        <Stripe />

        <div className='flex h-[40px] items-center'>
          <IconButton />
          <Checkbox />
          <Input className='w-[280px]' />
          <Select className='w-[240px]' />
          <IconButton />
        </div>

        <Stripe row={1} />
      </div>

      <div className='flex flex-col m-4'>
        <Stripe compact />

        {/* TODO(burdon): Auto size from context? */}
        <div className='flex h-[40px] items-center'>
          <IconButton />
          <Checkbox />
          <Input className='w-[280px]' />
          <Select className='w-[240px]' />
          <IconButton />
        </div>

        <Stripe compact row={1} />
      </div>

      {/* TODO(burdon): Create grid overlay. */}
      <div className='flex flex-col m-4'>
        {Array.from({ length: 4 }).map((_, i) => (
          <Stripe key={i} compact row={i} />
        ))}
      </div>
    </Frame>
  );
};
