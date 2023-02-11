//
// Copyright 2022 DXOS.org
//

import React, { FC, useState } from 'react';

import { EchoObject } from '@dxos/echo-schema';
import { useQuery } from '@dxos/react-client';
import { Searchbar } from '@dxos/react-components';

import { ProjectCard } from '../../containers';
import { useSpace } from '../../hooks';
import { Project, tags } from '../../proto';
import { Kanban, KanbanColumnDef } from './Kanban';

const ProjectContent: FC<{ object: EchoObject }> = ({ object }) => {
  return <ProjectCard project={object as Project} />;
};

// TODO(burdon): Generalize type and field.
export const KanbanFrame: FC = () => {
  const space = useSpace();

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
    await space.experimental.db.save(project);
  };

  // TODO(burdon): Type and column/field selectors.
  return (
    <div className='flex flex-col flex-1 overflow-hidden'>
      <div className='py-3 px-0 md:px-2'>
        <div className='w-screen md:w-column px-4 md:px-2'>
          <Searchbar onSearch={handleSearch} />
        </div>
      </div>

      <div className='flex flex-1 overflow-hidden'>
        <Kanban objects={objects} columns={columns} onCreate={handleCreate} />
      </div>
    </div>
  );
};

export default KanbanFrame;
