//
// Copyright 2022 DXOS.org
//

import React, { FC, useState } from 'react';

import { Contact, Project } from '@dxos/kai-types';
import { tags } from '@dxos/kai-types/testing';
import { Toolbar } from '@dxos/mosaic';
import { Select } from '@dxos/react-appkit';
import { TypedObject, TypeFilter, useQuery } from '@dxos/react-client/echo';

import { Kanban, KanbanColumnDef } from './Kanban';
import { ProjectCard, ContactCard } from '../../cards';
import { useFrameContext } from '../../hooks';

type Type = {
  name: string;
  label: string;
  filter: TypeFilter<any>;
  getTitle: (object: TypedObject) => string;
  Card: FC<any>;
};

// TODO(burdon): From metadata.
const types: Type[] = [
  {
    name: 'dxos.experimental.kai.Contact',
    label: 'Contacts',
    filter: Contact.filter(),
    getTitle: (object) => object.name,
    Card: ContactCard,
  },
  {
    name: 'dxos.experimental.kai.Project',
    label: 'Projects',
    filter: Project.filter(),
    getTitle: (object) => object.title,
    Card: ProjectCard,
  },
];

// TODO(burdon): Generalize type and field.
export const KanbanFrame: FC = () => {
  const { space } = useFrameContext();
  const [typeName, setTypeName] = useState<string>(types[0].name);
  const type = types.find(({ name }) => name === typeName)!;
  const [text] = useState<string>();

  // TODO(burdon): Chain filters.
  const objects = useQuery(space, type.filter).filter(
    // TODO(burdon): Generalize search (by default all text; use schema annotations).
    (object: TypedObject) => !text?.length || type.getTitle(object).toLowerCase().indexOf(text) !== -1,
  );

  // TODO(burdon): Pass in filter.
  const columns: KanbanColumnDef[] = tags.map((tag) => ({
    id: tag,
    header: tag,
    // TODO(burdon): Reconcile KanbanColumnDef and type above.
    title: (object) => type.getTitle(object),
    filter: (object) => (object as Project).tag === tag,
    Card: type.Card,
  }));

  const handleCreate = async (column: KanbanColumnDef) => {
    const project = new Project({ tag: column.id });
    await space?.db.add(project);
  };

  if (!space) {
    return null;
  }

  // TODO(burdon): Type and column/field selectors.
  return (
    <div className='flex flex-col flex-1 overflow-hidden'>
      <Toolbar className='mb-4'>
        <Select value={typeName} onValueChange={setTypeName}>
          {types.map(({ name, label }) => (
            <Select.Item key={name} value={name}>
              {label}
            </Select.Item>
          ))}
        </Select>
      </Toolbar>

      <div className='flex flex-1 overflow-hidden'>
        <Kanban space={space} objects={objects} columns={columns} onCreate={handleCreate} />
      </div>
    </div>
  );
};

export default KanbanFrame;
