//
// Copyright 2023 DXOS.org
//

import { PlusCircle } from 'phosphor-react';
import React, { FC } from 'react';

import { EchoObject, id } from '@dxos/echo-schema';
import { getSize } from '@dxos/react-components';

import { Button } from '../components';

export type KanbanColumnDef = {
  id?: string;
  header: string;
  title: (object: EchoObject) => string;
  filter: (object: EchoObject) => boolean;
  Content: FC<{ object: EchoObject }>;
};

// TODO(burdon): Slots.
// TODO(burdon): Drag.
// TODO(burdon): Delete item.

export const Kanban: FC<{
  objects: EchoObject[];
  columns: KanbanColumnDef[];
  columnWidth?: number;
  onCreate?: (column: KanbanColumnDef) => void;
}> = ({ objects, columns, columnWidth = 300, onCreate }) => {
  return (
    <div className='flex flex-1 p-3 overflow-x-scroll overflow-y-hidden'>
      <div className='flex'>
        {columns.map((column, i) => {
          const filtered = objects.filter(column.filter);

          return (
            <div
              key={column.id ?? i}
              className='flex flex-col ml-4 first:ml-0 drop-shadow-md bg-gray-100'
              style={{ width: columnWidth }}
            >
              <div className='p-2 rounded-t'>{column.header}</div>
              <div className='flex flex-1 flex-col pl-2 pr-2 overflow-y-scroll'>
                <div>
                  {filtered.map((object) => {
                    const Content = column.Content;
                    return (
                      <div key={object[id]} className='mt-2 bg-white rounded border border-slate-300'>
                        <Content object={object} />
                      </div>
                    );
                  })}
                </div>
              </div>
              {onCreate && (
                <div className='flex flex-shrink-0 items-center p-2'>
                  <div className='text-sm'>
                    {filtered.length} record{filtered.length === 1 ? '' : 's'}
                  </div>
                  <div className='flex-1' />
                  <Button onClick={() => onCreate(column)}>
                    <PlusCircle className={getSize(5)} />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
