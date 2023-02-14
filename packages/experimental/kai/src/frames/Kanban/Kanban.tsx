//
// Copyright 2023 DXOS.org
//

import { PlusCircle } from 'phosphor-react';
import React, { FC } from 'react';

import { EchoObject, id } from '@dxos/echo-schema';
import { getSize, Button } from '@dxos/react-components';

export type KanbanColumnDef = {
  id?: string;
  header: string;
  title: (object: EchoObject) => string;
  filter: (object: EchoObject) => boolean;
  Content: FC<{ object: EchoObject }>;
};

// TODO(burdon): Classes.
// TODO(burdon): Drag.
// TODO(burdon): Delete item.

export const Kanban: FC<{
  objects: EchoObject[];
  columns: KanbanColumnDef[];
  onCreate?: (column: KanbanColumnDef) => void;
}> = ({ objects, columns, onCreate }) => {
  // NOTE: On mobile (sm) the column width is set to the full screen (w-screen)
  // with different padding from other screen sized.
  return (
    <div className='flex flex-1 overflow-x-auto overflow-y-hidden snap-x px-0 md:px-2'>
      <div className='flex'>
        {/* Columns */}
        {columns.map((column, i) => {
          const filtered = objects.filter(column.filter);

          return (
            <div
              key={column.id ?? i}
              className='flex flex-col overflow-hidden w-screen md:w-column snap-center px-4 md:px-2 pb-4'
            >
              <div className='flex flex-col first:ml-0 overflow-hidden border drop-shadow-md rounded'>
                <div className='flex p-2 rounded-t text-sm'>{column.header}</div>
                <div className='flex flex-col flex-1 overflow-y-auto px-2'>
                  {/* Cards. */}
                  {filtered.map((object) => {
                    const { Content } = column;
                    return (
                      <div key={object[id]} className='mb-2 bg-paper-bg rounded border'>
                        <Content object={object} />
                      </div>
                    );
                  })}
                </div>

                {onCreate && (
                  <div className='flex shrink-0 items-center p-2'>
                    <div className='flex flex-1 text-sm'>
                      {filtered.length > 0 && (
                        <span>
                          {filtered.length} record{filtered.length === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>
                    <div className='flex flex-1 justify-center'>
                      <Button compact variant='ghost' onClick={() => onCreate(column)}>
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
