//
// Copyright 2023 DXOS.org
//

import React, { type HTMLAttributes, useState } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

export const Tree = ({ classNames, data }: ThemedClassName<{ data?: object }>) => {
  return (
    <div className={mx('flex w-full py-2 overflow-auto', classNames)}>
      <Node data={data} root />
    </div>
  );
};

export const Node = ({ data }: ThemedClassName<{ data?: any; root?: boolean }>) => {
  if (typeof data !== 'object' || data === undefined || data === null) {
    return <Scalar value={data} />;
  }

  if (Array.isArray(data)) {
    return (
      <div className='flex flex-col space-y-1'>
        {data.map((value, index) => (
          <KeyValue key={index} label={String(index)} data={value} classNames='text-description font-thin' />
        ))}
      </div>
    );
  }

  return (
    <div className='flex flex-col space-y-1'>
      {Object.entries(data).map(([key, value]) => (
        <KeyValue key={key} label={key} data={value} classNames='bg-group-surface text-description font-thin' />
      ))}
    </div>
  );
};

export const KeyValue = ({ classNames, label, data }: ThemedClassName<{ label: string; data?: any }>) => {
  const [open, setOpen] = useState(true);
  if (data === undefined) {
    return null;
  }

  return (
    <div className='flex'>
      <Box
        className={mx('flex py-0.5 select-none text-sm cursor-pointer', classNames)}
        role='button'
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen((open) => !open)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setOpen((open) => !open);
          }
        }}
      >
        {label}
      </Box>
      {open && <Node data={data} />}
    </div>
  );
};

const Scalar = ({ classNames, value }: ThemedClassName<{ value: any }>) => {
  return (
    <Box className={mx('dx-tag dx-tag--green text-xs items-center', classNames)}>
      {(value === undefined && 'undefined') ||
        (value === null && 'null') ||
        (typeof value === 'string' && value) ||
        JSON.stringify(value)}
    </Box>
  );
};

const Box = ({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className={mx('flex px-2 font-mono truncate', className)} {...props}>
      {children}
    </div>
  );
};
