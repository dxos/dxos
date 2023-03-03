//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';
import urlJoin from 'url-join';

import { Document } from '@dxos/echo-schema';
import { Config, Space, useQuery } from '@dxos/react-client';
import { Table as TableComponent } from '@dxos/react-components';
import { Composer } from '@dxos/react-composer';

import { FilePreview } from '../../components';
import { TaskList as TaskListComponent } from '../../containers';
import { Document as TypeDocument, File, Table, TaskList } from '../../proto';
import { getColumnType } from '../Table';

export const StackContent: FC<{ config: Config; space: Space; object: Document; spellCheck: boolean }> = ({
  config,
  space,
  object,
  spellCheck
}) => {
  // TODO(burdon): Type?
  switch (object.__typename) {
    case TypeDocument.type.name: {
      if (!(object instanceof TypeDocument)) {
        throw new Error(`Invalid object type: ${object.__typename}`);
      }
      return (
        <Composer
          document={object.content}
          slots={{
            editor: {
              className: 'kai-composer',
              spellCheck
            }
          }}
        />
      );
    }

    case Table.type.name: {
      if (!(object instanceof Table)) {
        throw new Error(`Invalid object type: ${object.__typename}`);
      }
      return (
        <div className='flex w-full h-[400px]'>
          <TableContainer space={space!} table={object} />
        </div>
      );
    }

    // TODO(burdon): Add/delete/sort.
    // TODO(burdon): Hide controls if not highlighted.
    case TaskList.type.name: {
      if (!(object instanceof TaskList)) {
        throw new Error(`Invalid object type: ${object.__typename}`);
      }
      return (
        <TaskListComponent
          space={space!}
          tasks={(object as TaskList).tasks}
          onCreate={(task) => object.tasks.push(task)}
        />
      );
    }

    case File.type.name: {
      if (!(object instanceof File)) {
        throw new Error(`Invalid object type: ${object.__typename}`);
      }
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
    <TableComponent<Document>
      columns={type.columns.filter((column) => column.Header === 'name' || column.Header === 'email')}
      data={objects}
      slots={{
        header: { className: 'bg-paper-bg' }
      }}
    />
  );
};
