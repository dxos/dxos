//
// Copyright 2023 DXOS.org
//

import React, { FC, useEffect, useState } from 'react';

import { Input, Main, useTranslation } from '@dxos/aurora';
import { defaultBlockSeparator, mx } from '@dxos/aurora-theme';
import { ObservableArray, subscribe } from '@dxos/observable-object';

import { KanbanColumns, KanbanItem } from '../props';
import type { KanbanModel } from '../props';
import { KanbanColumnComponent, KanbanColumnComponentPlaceholder } from './KanbanColumn';

// TODO(burdon): Drag columns (option).
// TODO(burdon): Scrolling (with snap).
// TODO(burdon): BG colors.

// TODO(burdon): Consistently use FC?
export const KanbanMainImpl: FC<{ columns: KanbanColumns }> = ({ columns }) => {
  const [_, setIter] = useState([]);
  useEffect(() => {
    // TODO(burdon): Copying from Stack. Create custom hook?
    return columns[subscribe](() => setIter([])) as () => void;
  }, []);

  const handleAddColumn = () => {
    columns.splice(columns.length, 0, {
      id: 'column-' + Math.random(),
      title: 'Column ' + (columns.length + 1),
      items: new ObservableArray<KanbanItem>(),
    });
  };

  const handleDeleteColumn = (id: string) => {
    const index = columns.findIndex((column) => column.id === id);
    if (index >= 0) {
      columns.splice(index, 1);
    }
  };

  return (
    <div className='flex grow p-2'>
      <div className='flex space-x-4'>
        {columns.map((column) => (
          <KanbanColumnComponent key={column.id} column={column} onDelete={() => handleDeleteColumn(column.id)} />
        ))}
        {/* TODO(burdon): Make it look like a column. */}
        <KanbanColumnComponentPlaceholder onAdd={handleAddColumn} />
      </div>
    </div>
  );
};

// TODO(burdon): Copying Stack; why array?
export const KanbanMain = ({ data: [kanban] }: { data: [kanban: KanbanModel] }) => {
  const { t } = useTranslation('dxos.org/plugin/kanban'); // TODO(burdon): Make consistent across plugins.
  return (
    <Main.Content classNames='min-bs-[100vh]'>
      <Input.Root>
        {/* TODO(burdon): Label shouldn't be unique per plugin? */}
        <Input.Label srOnly>{t('kanban title label')}</Input.Label>
        {/* TODO(burdon): Is classNames boilerplate required everywhere? How to make consistent across plugins? Same for separator, etc. */}
        <Input.TextInput
          variant='subdued'
          classNames='flex-1 min-is-0 is-auto pis-6 plb-3.5 pointer-fine:plb-2.5'
          defaultValue={kanban.title}
          onChange={({ target: { value } }) => (kanban.title = value)}
        />
      </Input.Root>
      <div role='separator' className={mx(defaultBlockSeparator, 'mli-3 mbe-2 opacity-50')} />
      <KanbanMainImpl columns={kanban.columns} />
    </Main.Content>
  );
};
