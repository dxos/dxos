//
// Copyright 2025 DXOS.org
//

import type { MouseEvent } from 'react';

import { type Node, type Action, type ActionGroup, type Graph } from '@dxos/app-graph';
import { type ToolbarRootProps, type ToolbarSeparatorProps, type IconButtonProps } from '@dxos/react-ui';

import { type MenuActionProperties, type MenuProps } from '../../defs';

export const ToolbarSeparatorType = '@dxos/react-ui-toolbar/separator' as const;

export type ToolbarSeparatorNode = Node<never, Pick<ToolbarSeparatorProps, 'variant'>> & {
  type: typeof ToolbarSeparatorType;
};

export const isSeparator = (node: Node): node is ToolbarSeparatorNode => node.type === ToolbarSeparatorType;

export type ToolbarAction = Action<MenuActionProperties & { variant: 'action' | 'toggle' }>;

export type ToolbarActionGroup = ActionGroup<
  MenuActionProperties & { variant: 'dropdownMenu' | 'toggleGroup' } & (
      | { selectCardinality?: 'single'; value?: string }
      | { selectCardinality?: 'multiple'; value?: string[] }
    )
>;

export const isMenu = (node: Node): node is ToolbarActionGroup => node.type === 'actionGroup';

export type ToolbarItem = ToolbarSeparatorNode | ToolbarAction | ToolbarActionGroup;

export type ToolbarProps = ToolbarRootProps &
  MenuProps<ToolbarItem> & { iconSize?: IconButtonProps['size']; graph?: Graph };

export type ToolbarActionGroupProps = Pick<ToolbarProps, 'iconSize'> & {
  actionGroup: ToolbarActionGroup;
  onClick: (action: ToolbarAction, event: MouseEvent) => void;
  graph?: Graph;
};
