//
// Copyright 2025 DXOS.org
//

import React, { type FC } from 'react';

import { type ComponentProps } from '../components';
import { ModuleContainer } from '../testing';

export type DefaultStoryProps = {
  modules: FC<ComponentProps>[][];
  showContext?: boolean;
  blueprints?: string[];
};

export const DefaultStory = (props: DefaultStoryProps) => {
  return <ModuleContainer {...props} />;
};
