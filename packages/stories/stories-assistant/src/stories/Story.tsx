//
// Copyright 2025 DXOS.org
//

import React, { type FC } from 'react';

import { type ComponentProps } from '../components';
import { ModuleContainer } from '../testing';

export type StoryProps = {
  modules: FC<ComponentProps>[][];
  showContext?: boolean;
  blueprints?: string[];
};

export const DefaultStory = (props: StoryProps) => {
  return <ModuleContainer {...props} />;
};
