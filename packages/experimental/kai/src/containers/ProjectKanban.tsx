//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';

import { EchoObject } from '@dxos/echo-schema';
import { useQuery } from '@dxos/react-client';

import { Kanban, KanbanColumnDef, Searchbar } from '../components';
import { useSpace } from '../hooks';
import { createProject, Project, tags } from '../proto';
import { ProjectCard } from './cards';

const ProjectContent: FC<{ object: EchoObject }> = ({ object }) => {
  return <ProjectCard project={object as Project} />;
};

export const ProjectKanban: FC = () => {
  const { space } = useSpace();

  // TODO(burdon): Generalize.
  const objects = useQuery(space, Project.filter());
  const columns: KanbanColumnDef[] = tags.map((tag) => ({
    id: tag,
    header: tag,
    title: (object: EchoObject) => (object as Project).title,
    filter: (object: EchoObject) => (object as Project).tag === tag,
    Content: ProjectContent
  }));

  const handleCreate = async (column: KanbanColumnDef) => {
    await createProject(space.experimental.db, column.id);
  };

  return (
    <div className='flex flex-col flex-1 overflow-hidden'>
      <div className='py-3 px-0 md:px-2'>
        <div className='w-screen md:w-[300px] px-4 md:px-2'>
          <Searchbar />
        </div>
      </div>

      <div className='flex flex-1 overflow-hidden'>
        <Kanban objects={objects} columns={columns} onCreate={handleCreate} />
      </div>
    </div>
  );
};
