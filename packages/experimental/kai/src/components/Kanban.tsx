//
// Copyright 2023 DXOS.org
//

import React, { FC } from 'react';

import { EchoObject, id } from '@dxos/echo-schema';

export type KanbanColumnDef = {
  id?: string;
  header: string;
  title: (object: EchoObject) => string;
  filter: (object: EchoObject) => boolean;
  Content: FC<{ object: EchoObject }>;
};

// TODO(burdon): Slots.
// TODO(burdon): Standardize items => objects across controls.
export const Kanban: FC<{ objects: EchoObject[]; columns: KanbanColumnDef[]; columnWidth?: number }> = ({
  objects,
  columns,
  columnWidth = 300
}) => {
  return (
    <div className='flex flex-1 p-3 overflow-x-scroll overflow-y-hidden'>
      <div className='flex'>
        {columns.map((column, i) => (
          <div
            key={column.id ?? i}
            className='flex flex-col ml-4 first:ml-0 drop-shadow-md bg-gray-100'
            style={{ width: columnWidth }}
          >
            <div className='p-2 rounded-t'>{column.header}</div>
            <div className='flex flex-1 flex-col pl-2 pr-2 overflow-y-scroll'>
              <div>
                {objects.filter(column.filter).map((object) => {
                  const Content = column.Content;
                  return (
                    <div key={object[id]} className='mt-2 bg-white rounded border border-slate-300'>
                      <Content object={object} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
