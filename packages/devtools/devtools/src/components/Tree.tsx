//
// Copyright 2023 DXOS.org
//

import React, { type FC, type HTMLAttributes, useState } from 'react';

import { mx } from '@dxos/ui-theme';

export const Tree: FC<{ data?: object }> = ({ data }) => {
  return (
    <div className='flex is-full plb-2 overflow-auto'>
      <Node data={data} root />
    </div>
  );
};

export const Node: FC<{ data?: any; root?: boolean }> = ({ data }) => {
  if (typeof data !== 'object' || data === undefined || data === null) {
    return <Scalar value={data} />;
  }

  if (Array.isArray(data)) {
    return (
      <div className='flex flex-col space-y-2'>
        {data.map((value, index) => (
          <KeyValue key={index} label={String(index)} data={value} className='text-description font-thin' />
        ))}
      </div>
    );
  }

  return (
    <div className='flex flex-col space-y-2'>
      {Object.entries(data).map(([key, value]) => (
        <KeyValue key={key} label={key} data={value} className='bg-groupSurface text-description font-thin' />
      ))}
    </div>
  );
};

export const KeyValue: FC<{ label: string; data?: any; className?: string }> = ({ label, data, className }) => {
  const [open, setOpen] = useState(true);
  if (data === undefined) {
    return null;
  }

  return (
    <div className='flex'>
      <Box
        className={mx('bg-inputSurface text-sm select-none cursor-pointer', className)}
        onClick={() => setOpen((open) => !open)}
      >
        {label}
      </Box>
      {open && <Node data={data} />}
    </div>
  );
};

const Scalar: FC<{ value: any }> = ({ value }) => {
  return (
    <Box className='bg-skySurface text-information rounded-r-sm text-sm font-thin'>
      {(value === undefined && 'undefined') ||
        (value === null && 'null') ||
        (typeof value === 'string' && value) ||
        JSON.stringify(value)}
    </Box>
  );
};

const Box: FC<HTMLAttributes<HTMLDivElement>> = ({ children, className, ...props }) => {
  return (
    <div className={mx('flex pli-2 font-mono truncate', className)} {...props}>
      {children}
    </div>
  );
};
