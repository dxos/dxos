//
// Copyright 2023 DXOS.org
//

import React, { type HTMLAttributes, useState } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

export const Tree = ({ classNames, data }: ThemedClassName<{ data?: object }>) => {
  return (
    <div role='none' className={mx('flex w-full py-2 overflow-auto', classNames)}>
      <Node data={data} root />
    </div>
  );
};

export const Node = ({ classNames, data }: ThemedClassName<{ data?: any; root?: boolean }>) => {
  if (typeof data !== 'object' || data === undefined || data === null) {
    return <Scalar value={data} />;
  }

  if (Array.isArray(data)) {
    return (
      <div className='flex flex-col space-y-2'>
        {data.map((value, index) => (
          <KeyValue key={index} label={String(index)} data={value} classNames='text-description font-thin' />
        ))}
      </div>
    );
  }

  return (
    <div className='flex flex-col space-y-2'>
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
        className={mx('bg-input-surface text-sm select-none cursor-pointer', classNames)}
        onClick={() => setOpen((open) => !open)}
      >
        {label}
      </Box>
      {open && <Node data={data} />}
    </div>
  );
};

const Scalar = ({ classNames, value }: ThemedClassName<{ value: any }>) => {
  return (
    <Box className={mx('text-sm bg-sky-surface text-sky-text rounded-r-sm', classNames)}>
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
