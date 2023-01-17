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
    <div className='flex flex-1 overflow-x-scroll overflow-y-hidden p-3 pt-0 pb-2'>
      <div className='flex'>
        {/* Columns */}
        {columns.map((column, i) => {
          const filtered = objects.filter(column.filter);

          return (
            <div
              key={column.id ?? i}
              className='flex flex-col overflow-hidden ml-4 first:ml-0 pb-2'
              style={{ width: columnWidth }}
            >
              <div className='flex flex-col overflow-hidden border drop-shadow-md bg-gray-100'>
                <div className='p-3 pt-2 pb-2 rounded-t text-sm'>{column.header}</div>

                <div className='flex overflow-hidden'>
                  <div className='flex flex-col pl-3 pr-3 overflow-y-scroll'>
                    {/* Cards. */}
                    {filtered.map((object) => {
                      const { Content } = column;
                      return (
                        <div key={object[id]} className='mt-2 bg-white rounded border border-slate-300'>
                          <Content object={object} />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {onCreate && (
                  <div className='flex flex-shrink-0 items-center p-3 mt-2'>
                    <div className='flex flex-1 text-sm'>
                      {filtered.length > 0 && (
                        <span>
                          {filtered.length} record{filtered.length === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>
                    <div className='flex flex-1 justify-center'>
                      <Button onClick={() => onCreate(column)}>
                        <PlusCircle className={getSize(6)} />
                      </Button>
                    </div>
                    <div className='flex flex-1' />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
