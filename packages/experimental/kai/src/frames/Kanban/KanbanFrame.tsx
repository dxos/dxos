//
// Copyright 2022 DXOS.org
//

import React, { FC, useState } from 'react';

import { EchoObject } from '@dxos/echo-schema';
import { Project } from '@dxos/kai-types';
import { tags } from '@dxos/kai-types/testing';
import { useQuery } from '@dxos/react-client';
import { Searchbar } from '@dxos/react-components';

import { Toolbar } from '../../components';
import { ProjectCard } from '../../containers';
import { useAppRouter } from '../../hooks';
import { Kanban, KanbanColumnDef } from './Kanban';

const ProjectContent: FC<{ object: EchoObject }> = ({ object }) => {
  const { space } = useAppRouter();
  if (!space) {
    return null;
  }

  return <ProjectCard space={space} project={object as Project} />;
};

// TODO(burdon): Generalize type and field.
export const KanbanFrame: FC = () => {
  const { space } = useAppRouter();

  const [text, setText] = useState<string>();
  const handleSearch = (text: string) => {
    setText(text);
  };

  // TODO(burdon): Chain filters.
  const objects = useQuery(space, Project.filter()).filter(
    // TODO(burdon): Generalize search (by default all text; use schema annotations).
    (object: Project) => !text?.length || object.title.toLowerCase().indexOf(text) !== -1
  );

  // TODO(burdon): Pass in filter.
  const columns: KanbanColumnDef[] = tags.map((tag) => ({
    id: tag,
    header: tag,
    title: (object: EchoObject) => (object as Project).title,
    filter: (object: EchoObject) => (object as Project).tag === tag,
    Content: ProjectContent
  }));

  const handleCreate = async (column: KanbanColumnDef) => {
    const project = new Project({ tag: column.id });
    await space?.db.add(project);
  };

  // TODO(burdon): Type and column/field selectors.
  return (
    <div className='flex flex-col flex-1 overflow-hidden'>
      <Toolbar className='w-screen md:w-column '>
        <Searchbar onSearch={handleSearch} />
      </Toolbar>

      <div className='flex flex-1 overflow-hidden'>
        <Kanban objects={objects} columns={columns} onCreate={handleCreate} />
      </div>
    </div>
  );
};

export default KanbanFrame;
