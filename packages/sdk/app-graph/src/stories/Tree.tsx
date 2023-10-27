//
// Copyright 2023 DXOS.org
//

import React, { type FC, type HTMLAttributes, useState } from 'react';

import { mx } from '@dxos/react-ui-theme';

// TODO(burdon): Copied form devtools.

export const Tree: FC<{ data?: object }> = ({ data }) => {
  return (
    <div className='flex overflow-auto ml-2 border-l-2 border-blue-500'>
      <Node data={data} root />
    </div>
  );
};

export const Node: FC<{ data?: any; root?: boolean }> = ({ data, root }) => {
  if (typeof data !== 'object' || data === undefined || data === null) {
    return <Scalar value={data} />;
  }

  if (Array.isArray(data)) {
    return (
      <div className='flex flex-col space-y-2'>
        {data.map((value, index) => (
          <KeyValue key={index} label={String(index)} data={value} className='bg-teal-50' />
        ))}
      </div>
    );
  }

  return (
    <div className='flex flex-col space-y-2'>
      {Object.entries(data).map(([key, value]) => (
        <KeyValue key={key} label={key} data={value} className='bg-blue-50' />
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
        className={mx('border-blue-200 text-sm select-none cursor-pointer', className)}
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
    <Box className='bg-green-50 border-green-200 rounded-r text-sm font-thin'>
      {(value === undefined && 'undefined') ||
        (value === null && 'null') ||
        (typeof value === 'string' && value) ||
        JSON.stringify(value)}
    </Box>
  );
};

const Box: FC<HTMLAttributes<HTMLDivElement>> = ({ children, className, ...props }) => {
  return (
    <div className={mx('flex px-2 border border-l-0 font-mono truncate', className)} {...props}>
      {children}
    </div>
  );
};
