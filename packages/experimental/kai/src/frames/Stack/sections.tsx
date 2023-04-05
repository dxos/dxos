//
// Copyright 2022 DXOS.org
//

import { Article, Image, ListChecks, Table as TableIcon, Trash } from '@phosphor-icons/react';
import React, { FC } from 'react';
import urlJoin from 'url-join';

import { TypedObject, Space } from '@dxos/client';
import { Contact, Document, DocumentStack, File, Table, TaskList } from '@dxos/kai-types';
import { Table as TableComponent } from '@dxos/mosaic';
import { useConfig, useIdentity, useQuery } from '@dxos/react-client';
import { Dialog } from '@dxos/react-components';
import { Composer } from '@dxos/react-composer';

import { TaskList as TaskListComponent } from '../../cards';
import { FilePreview } from '../../components';
import { useAppRouter } from '../../hooks';
import { FilePlugin, imageTypes } from '../File';
import { getColumnType } from '../Table';
import { ActionDialog, CustomStackMenuAction } from './CustomActionMenu';

// TODO(burdon): Generalize with Presenter.
export const sectionActions = (section?: DocumentStack.Section) => {
  const insert = (stack: DocumentStack, section: DocumentStack.Section | undefined, object: TypedObject) => {
    const idx = section ? stack.sections.findIndex(({ id }) => id === section.id) : stack.sections.length;
    stack.sections.splice(idx, 0, new DocumentStack.Section({ object }));
  };

  const actions: CustomStackMenuAction[][] = [
    [
      {
        id: Document.type.name,
        label: 'Text',
        Icon: Article,
        onAction: (stack, section) => insert(stack, section, new Document())
      },
      {
        id: TaskList.type.name,
        label: 'Tasks',
        Icon: ListChecks,
        onAction: (stack, section) => insert(stack, section, new TaskList())
      },
      {
        id: Table.type.name,
        label: 'Table',
        Icon: TableIcon,
        onAction: (stack, section) => insert(stack, section, new Table({ type: Contact.type.name }))
      },
      {
        id: File.type.name,
        label: 'Image',
        Icon: Image,
        Dialog: FileSelector
      }
    ]
  ];

  if (section) {
    actions.push([
      {
        id: 'delete',
        label: 'Delete section',
        Icon: Trash,
        onAction: (stack, section) => {
          const idx = stack.sections.findIndex(({ id }) => id === section!.id);
          stack.sections.splice(idx, 1);
        }
      }
    ]);
  }

  return actions;
};

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

// TODO(burdon): Factor out and make configurable.
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

// TODO(burdon): Generalize Dialog.
export const FileSelector: ActionDialog = ({ stack, section, onClose }) => {
  const { space } = useAppRouter();
  const insert = (stack: DocumentStack, section: DocumentStack.Section | undefined, object: TypedObject) => {
    const idx = section ? stack.sections.findIndex(({ id }) => id === section.id) : stack.sections.length;
    stack.sections.splice(idx, 0, new DocumentStack.Section({ object }));
  };

  const handleSelect = (objectId?: string) => {
    if (objectId) {
      const object = space!.db.getObjectById<File>(objectId);
      if (object) {
        insert(stack, section, object);
      }
    }

    onClose();
  };

  return (
    <Dialog
      open={true}
      onOpenChange={() => onClose()}
      title='Select image'
      closeLabel='Close'
      slots={{ content: { className: 'overflow-hidden max-w-full max-h-[50vh] md:max-w-[400px] md:max-h-[640px]' } }}
    >
      <FilePlugin disableDownload fileTypes={imageTypes} onSelect={handleSelect} />
    </Dialog>
  );
};
