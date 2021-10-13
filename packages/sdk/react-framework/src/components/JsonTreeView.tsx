//
// Copyright 2020 DXOS.org
//

import {
  ChevronRight as ChevronRightIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { TreeItem as MuiTreeItem, TreeView as MuiTreeView } from '@mui/lab';
import { styled, Typography } from '@mui/material';
import isPlainObject from 'lodash.isplainobject';
import React, { ReactElement, useEffect, useState } from 'react';

import { keyToString } from '@dxos/crypto';
import { truncateString } from '@dxos/debug';

const StyledTreeView = styled(MuiTreeView)({ overflowX: 'hidden' });

const ItemRoot = styled(MuiTreeItem)({
  display: 'flex',
  flexDirection: 'column',
  overflowX: 'hidden'
});

const LabelRoot = styled('div')({
  display: 'flex',
  overflowX: 'hidden'
});

const Label = styled(Typography)(({ fontSize }: { fontSize?: string }) => ({
  fontSize: fontSize === 'small' ? 14 : undefined
}));

const DefaultValue = styled(Typography)(({ fontSize }: { fontSize?: string }) => ({
  overflowX: 'hidden',
  paddingLeft: 8,
  whiteSpace: 'pre-line',
  wordBreak: 'break-word',
  fontSize: fontSize === 'small' ? 14 : undefined
}));

const KeyStrValue = styled(DefaultValue)(({ theme }) => ({
  color: theme.palette.info.main,
  fontFamily: 'monospace'
}));

const BooleanValue = styled(DefaultValue)(({ theme }) => ({
  color: theme.palette.info.main
}));

//
// Calculate all IDs.
//
const visitor = (value: any, depth = 1, path = '', ids: string[] = [], i = 0) => {
  if (i >= depth) {
    return ids;
  }

  ids.push(path || '.');

  if (isPlainObject(value)) {
    Object.entries(value).forEach(([key, value]) => visitor(value, depth, `${path}.${key}`, ids, i + 1));
  } else if (Array.isArray(value)) {
    value.forEach((value, i) => visitor(value, depth, `${path}.${i}`, ids, i + 1));
  }

  return ids;
};

/**
 * TreeItem wrapper.
 */
const TreeItem = ({
  nodeId,
  size,
  label,
  value,
  children
}: {
  nodeId: string,
  size: string | undefined,
  label: string,
  value?: ReactElement,
  children?: React.ReactNode
}) => {
  return (
    <ItemRoot
      nodeId={nodeId}
      label={(
        <LabelRoot>
          <Label color='primary' fontSize={size}>{label}</Label>
          {value}
        </LabelRoot>
      )}
    >
      {children}
    </ItemRoot>
  );
};

interface JsonTreeViewProps {
  className?: string
  data?: any
  depth?: number
  onSelect?: () => void
  root?: string
  size?: string
}

/**
 * Visualizes an object as a tree view of all properties.
 * Works with JSON and other objects with nested values.
 * @param data The object to be visualized
 * @param depth Maximum nest depth to be visualized. Unlimited by default.
 * @param onSelect Callback for when one or more nodes are selected by the user.
 */
export const JsonTreeView = ({
  data = {},
  depth = Infinity,
  onSelect = () => {},
  root,
  size
}: JsonTreeViewProps) => {
  if (!data) {
    data = {};
  }

  const [expanded, setExpanded] = useState<string[]>([]);

  // Needed to determine if data has changed.
  const diff = JSON.stringify(data);
  useEffect(() => {
    const nodeIds = visitor(data, depth);
    setExpanded(nodeIds);
  }, [diff, depth]);

  //
  // Recursively render items.
  //
  const renderNode = (value: any, key: string, level = 0, path = ''): any => {
    if (value === undefined || value === '') {
      return;
    }

    if (isPlainObject(value)) {
      const items = Object.entries(value).map(([key, value]) => renderNode(value, key, level + 1, `${path}.${key}`)).filter(Boolean);
      return (!root && level === 0)
        ? items
        : <TreeItem size={size} key={path} nodeId={path || '.'} label={key}>{items}</TreeItem>;
    }

    if (Array.isArray(value)) {
      const items = value.map((value, key) => renderNode(value, `[${key}]`, level + 1, `${path}.${key}`)).filter(Boolean);
      return (!root && level === 0)
        ? items
        : <TreeItem size={size} key={path} nodeId={path} label={key}>{items}</TreeItem>;
    }

    // TODO(burdon): Pluggable types (e.g., date, string, number, boolean, etc).
    let ValueComponent: any = DefaultValue;
    if (value instanceof Uint8Array) {
      value = truncateString(keyToString(value), 16);
      ValueComponent = KeyStrValue;
    } else if (typeof value === 'boolean') {
      ValueComponent = BooleanValue;
    }

    const itemValue = value !== undefined
      ? <ValueComponent fontSize={size}>{String(value)}</ValueComponent>
      : undefined;

    return <TreeItem size={size} key={path} nodeId={path} label={key} value={itemValue} />;
  };

  const handleToggle = (_event: React.ChangeEvent<unknown>, nodeIds: string[]) => {
    setExpanded(nodeIds);
  };

  // TODO(burdon): Controller
  return (
    <StyledTreeView
      defaultCollapseIcon={<ExpandMoreIcon />}
      defaultExpandIcon={<ChevronRightIcon />}
      onNodeSelect={onSelect}
      onNodeToggle={handleToggle}
      expanded={expanded}
      selected={[]}
    >
      {renderNode(data, root || '')}
    </StyledTreeView>
  );
};
