//
// Copyright 2023 DXOS.org
//

import { type IconProps, StackSimple } from '@phosphor-icons/react';
import React from 'react';

export const STACK_PLUGIN = 'dxos.org/plugin/stack';
export const SECTION_IDENTIFIER = 'dxos.org/type/StackSection';

export default {
  id: STACK_PLUGIN,
  name: 'Stacks',
  description: 'View and arrange objects in stacks.',
  iconComponent: (props: IconProps) => <StackSimple {...props} />,
};
