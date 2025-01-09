//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Toolbar as NaturalToolbar } from '@dxos/react-ui';

import type { ToolbarActionGroupProps } from './defs';

export const ToolbarToggleGroup = ({ actionGroup, graph }: ToolbarActionGroupProps) => {
  const menuActions = useMemo(() => (graph ? graph.actions(actionGroup) : []), [actionGroup, graph]);
  const { selectCardinality, value } = actionGroup.properties;
  return (
    // TODO(thure): This is extremely difficult to manage, what do?
    // @ts-ignore
    <NaturalToolbar.ToggleGroup type={selectCardinality} value={value}></NaturalToolbar.ToggleGroup>
  );
};
