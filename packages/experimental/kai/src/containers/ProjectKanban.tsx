//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';

import { EchoObject } from '@dxos/echo-schema';
import { useQuery } from '@dxos/react-client';

import { Kanban, KanbanColumnDef, Searchbar } from '../components';
import { useSpace } from '../hooks';
import { Project, tags } from '../proto';
import { ProjectItem } from './ProjectList';

const ProjectContent: FC<{ object: EchoObject }> = ({ object }) => {
  return <ProjectItem project={object as Project} />;
};

export const ProjectKanban: FC = () => {
  const { space } = useSpace();
  const projects = useQuery(space, Project.filter());

  const titleAccessor = (object: EchoObject) => (object as Project).title;
  const columns: KanbanColumnDef[] = tags.map((tag) => ({
    header: tag,
    title: titleAccessor,
    Content: ProjectContent,
    // filter: (object: EchoObject) => (object as Project).tags.has(tag)
    filter: (object: EchoObject) => (object as Project).tag === tag
  }));

  return (
    <div className='flex flex-col flex-1 overflow-hidden'>
      <div className='flex p-2'>
        <div>
          <Searchbar />
        </div>
      </div>
      <div className='flex flex-1 overflow-hidden'>
        <Kanban objects={projects} columns={columns} />
      </div>
    </div>
  );
};
