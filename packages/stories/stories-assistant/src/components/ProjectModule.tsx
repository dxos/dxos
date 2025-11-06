//
// Copyright 2025 DXOS.org
//

import React, { type FC } from 'react';

import { Surface } from '@dxos/app-framework/react';
import { Filter } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { DataType } from '@dxos/schema';

import { type ComponentProps } from './types';

export const ProjectModule: FC<ComponentProps> = ({ space }) => {
  const projects = useQuery(space, Filter.type(DataType.Project.Project));
  return <Surface role='article' limit={1} data={{ subject: projects.at(-1) }} />;
};
