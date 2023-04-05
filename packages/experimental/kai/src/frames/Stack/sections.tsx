//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';
import urlJoin from 'url-join';

import { Document, DocumentStack, File, Table, TaskList } from '@dxos/kai-types';
import { Table as TableComponent } from '@dxos/mosaic';
import { Space, TypedObject, useConfig, useIdentity, useQuery } from '@dxos/react-client';
import { Composer } from '@dxos/react-composer';

import { FilePreview } from '../../components';
import { useAppRouter } from '../../hooks';
import { getColumnType } from '../Table';
import { TaskList as TaskListComponent } from '../Task';

export const StackSection: FC<{ section: DocumentStack.Section }> = ({ section }) => {
  const config = useConfig();
  const identity = useIdentity();
  const { space } = useAppRouter();
  const object = section.object;

  switch (object.__typename) {
    case Document.type.name: {
      return (
        // TODO(burdon): Placeholder.
        <Composer
          identity={identity}
          space={space}
          text={object.content}
          slots={{
            editor: {
              spellCheck: false // TODO(burdon): Config.
            }
          }}
        />
      );
    }

    case Table.type.name: {
      return (
        <div className='flex w-full h-[400px]'>
          <TableContainer space={space!} table={object as Table} />
        </div>
      );
    }

    // TODO(burdon): Add/delete/sort.
    // TODO(burdon): Hide controls if not highlighted.
    case TaskList.type.name: {
      return (
        <TaskListComponent
          id='tasks'
          tasks={(object as TaskList).tasks}
          onCreateItem={(task) => object.tasks.push(task)}
        />
      );
    }

    case File.type.name: {
      return (
        <div className='flex w-full h-[400px]'>
          <FilePreview url={urlJoin(config.values.runtime!.services!.ipfs!.gateway!, object.cid)} image />
        </div>
      );
    }

    default:
      return null;
  }
};

// TODO(burdon): Factor out.
// TODO(burdon): Make configurable.
const TableContainer: FC<{ space: Space; table: Table }> = ({ space, table }) => {
  const type = getColumnType(table.type);
  const objects = useQuery(space, type.filter);

  return (
    <TableComponent<TypedObject>
      columns={type.columns.filter((column) => column.Header === 'name' || column.Header === 'email')}
      data={objects}
      slots={{
        header: { className: 'bg-paper-bg' }
      }}
    />
  );
};
