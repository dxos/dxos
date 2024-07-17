//
// Copyright 2024 DXOS.org
//

import { Database } from '@phosphor-icons/react';
import React from 'react';

import { type DatabaseInfo } from '../../../hooks';
import { type CustomPanelProps, Panel } from '../Panel';

export const DatabasePanel = ({ database, ...props }: CustomPanelProps<{ database?: DatabaseInfo }>) => {
  return (
    <Panel
      {...props}
      icon={Database}
      title='Database'
      info={
        <div className='flex items-center gap-2'>
          <div className='flex gap-1'>
            {database?.spaces?.toLocaleString()}
            <span>Space(s)</span>
          </div>
          <div className='flex gap-1'>
            {database?.objects?.toLocaleString()}
            <span>Object(s)</span>
          </div>
          <div className='flex gap-1'>
            {database?.documents?.toLocaleString()}
            <span>Document(s)</span>
          </div>
          <div className='flex gap-1'>
            {database?.documentsToReconcile?.toLocaleString()}
            <span>to sync</span>
          </div>
        </div>
      }
    />
  );
};
