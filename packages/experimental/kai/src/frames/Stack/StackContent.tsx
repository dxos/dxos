//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';
import urlJoin from 'url-join';

import { Document, EchoObject } from '@dxos/echo-schema';
import { Config, Space, useQuery } from '@dxos/react-client';
import { Table as TableComponent } from '@dxos/react-components';
import { Composer } from '@dxos/react-composer';

import { FilePreview } from '../../components';
import { TaskList as TaskListComponent } from '../../containers';
import { TextDocument, File, Table, TaskList } from '../../proto';
import { getColumnType } from '../Table';

export const StackContent: FC<{ config: Config; space: Space; object: EchoObject; spellCheck: boolean }> = ({
  config,
  space,
  object,
  spellCheck
}) => {
  // TODO(burdon): Type?
  switch ((object as any).__typename) {
    case TextDocument.type.name: {
      return (
        <Composer
          document={(object as TextDocument).content}
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
          space={space!}
          tasks={(object as TaskList).tasks}
          onCreate={(task) => (object as TaskList).tasks.push(task)}
        />
      );
    }

    case File.type.name: {
      return (
        <div className='flex w-full h-[400px]'>
          <FilePreview url={urlJoin(config.values.runtime!.services!.ipfs!.gateway!, (object as File).cid)} image />
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
