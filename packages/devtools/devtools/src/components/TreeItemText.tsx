import React, { ReactNode } from 'react';

export type TreeItemTextProps = {
  primary: ReactNode;
  secondary?: ReactNode;
};

export const TreeItemText = ({ primary, secondary }: TreeItemTextProps) => (
  <div className='flex gap-2 overflow-hidden whitespace-nowrap'>
    <span>{primary}</span>
    <span className='text-gray-400'>{secondary}</span>
  </div>
);
