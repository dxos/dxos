//
// Copyright 2022 DXOS.org
//

import React, { FC, useState } from 'react';

import { Document, TypeFilter } from '@dxos/echo-schema';
import { Contact, Project } from '@dxos/kai-types';
import { tags } from '@dxos/kai-types/testing';
import { useQuery } from '@dxos/react-client';
import { Searchbar, Select } from '@dxos/react-components';

import { Toolbar } from '../../components';
import { ProjectCard } from '../../containers';
import { useAppRouter } from '../../hooks';
import { ContactCard } from '../Contact';
import { Kanban, KanbanColumnDef } from './Kanban';

type Type = {
  name: string;
  label: string;
  filter: TypeFilter<any>;
  getTitle: (object: Document) => string;
  Card: FC<any>;
};

const types: Type[] = [
  {
    name: 'dxos.experimental.kai.Project',
    label: 'Projects',
    filter: Project.filter(),
    getTitle: (object) => object.title,
    Card: ProjectCard
  },
  {
    name: 'dxos.experimental.kai.Contact',
    label: 'Contacts',
    filter: Contact.filter(),
    getTitle: (object) => object.name,
    Card: ContactCard
  }
];

// TODO(burdon): Generalize type and field.
export const KanbanFrame: FC = () => {
  const { space } = useAppRouter();

  const [typeName, setTypeName] = useState<string>(types[0].name);
  const type = types.find(({ name }) => name === typeName)!;

  const [text, setText] = useState<string>();
  const handleSearch = (text: string) => {
    setText(text);
  };

  // TODO(burdon): Chain filters.
  const objects = useQuery(space, type.filter).filter(
    // TODO(burdon): Generalize search (by default all text; use schema annotations).
    (object: Document) => !text?.length || type.getTitle(object).toLowerCase().indexOf(text) !== -1
  );

  // TODO(burdon): Pass in filter.
  const columns: KanbanColumnDef[] = tags.map((tag) => ({
    id: tag,
    header: tag,
    // TODO(burdon): Reconcile KanbanColumnDef and type above.
    title: (object) => type.getTitle(object),
    filter: (object) => (object as Project).tag === tag,
    Card: type.Card
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
        <div className='w-screen md:w-column mr-4'>
          <Searchbar onSearch={handleSearch} />
        </div>
        <Select defaultValue={typeName} onValueChange={setTypeName}>
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
