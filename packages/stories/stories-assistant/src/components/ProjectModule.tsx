//
// Copyright 2025 DXOS.org
//

import React, { type FC } from 'react';

import { Surface } from '@dxos/app-framework/react';
import { Filter } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { Project } from '@dxos/types';

import { type ComponentProps } from './types';

export const ProjectModule: FC<ComponentProps> = ({ space }) => {
  const projects = useQuery(space.db, Filter.type(Project.Project));
  return <Surface role='article' limit={1} data={{ subject: projects.at(-1) }} />;
};
