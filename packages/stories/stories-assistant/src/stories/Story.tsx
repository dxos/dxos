//
// Copyright 2025 DXOS.org
//

import React, { type FC } from 'react';

import { type ModuleProps } from '../components';
import { ModuleContainer } from '../testing';

export type DefaultStoryProps = {
  modules: FC<ModuleProps>[][];
  showContext?: boolean;
  blueprints?: string[];
};

export const DefaultStory = (props: DefaultStoryProps) => {
  return <ModuleContainer {...props} />;
};
