//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';
import urlJoin from 'url-join';

import { TypedObject, Text } from '@dxos/echo-schema';
import { Document, DocumentStack, File, Table, TaskList } from '@dxos/kai-types';
import { Config, Space, useIdentity, useQuery } from '@dxos/react-client';
import { Table as TableComponent } from '@dxos/react-components';
import { MarkdownComposer, RichTextComposer, useTextModel, YText, YXmlFragment } from '@dxos/react-composer';

import { TaskList as TaskListComponent } from '../../cards';
import { FilePreview } from '../../components';
import { getColumnType } from '../Table';

const Composer: FC<{ space: Space; content: Text; spellCheck: boolean }> = ({ space, content, spellCheck }) => {
  const identity = useIdentity();
  const model = useTextModel({ identity, space, text: content });
  if (model?.content instanceof YText) {
    return <MarkdownComposer model={model} />;
  } else if (model?.content instanceof YXmlFragment) {
    return (
      <RichTextComposer
        model={model}
        slots={{
          editor: {
            className: 'p-0', // TODO(burdon): Not passed through.
            spellCheck
          }
        }}
      />
    );
  } else {
    return null;
  }
};

export const StackContent: FC<{
  config: Config;
  space: Space;
  section: DocumentStack.Section;
  spellCheck: boolean;
}> = ({ config, space, section, spellCheck }) => {
  const object = section.object;

  // TODO(burdon): Type?
  switch (object.__typename) {
    case Document.type.name: {
      // TODO(burdon): This fails if the document is created by the KaiBot!
      // if (!(object instanceof TypedObject)) {
      //   throw new Error(`Invalid object type: ${object.__typename}`);
      // }
      return <Composer space={space} content={object.content} spellCheck={spellCheck} />;
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
          id='tasks'
          tasks={(object as TaskList).tasks}
          onCreateItem={(task) => object.tasks.push(task)}
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
    <TableComponent<TypedObject>
      columns={type.columns.filter((column) => column.Header === 'name' || column.Header === 'email')}
      data={objects}
      slots={{
        header: { className: 'bg-paper-bg' }
      }}
    />
  );
};
