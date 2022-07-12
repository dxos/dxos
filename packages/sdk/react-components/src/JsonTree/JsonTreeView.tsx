//
// Copyright 2021 DXOS.org
//

import isPlainObject from 'lodash.isplainobject';
import React, { ChangeEvent, ReactElement, ReactNode, useEffect, useState } from 'react';

import {
  ChevronRight as ChevronRightIcon,
  ExpandMore as ExpandMoreIcon,
  MoreHoriz as BulletIcon
} from '@mui/icons-material';
import { TreeItem as MuiTreeItem, TreeView as MuiTreeView } from '@mui/lab';
import { Box, Typography, styled, useTheme } from '@mui/material';

import { keyToString } from '@dxos/crypto';
import { truncateKey } from '@dxos/debug';
import { PublicKey } from '@dxos/protocols';

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

// https://mui.com/customization/default-theme
interface DefaultValueProps {
  size?: Size
}
const DefaultValue = styled(Typography)<DefaultValueProps>(({ size }) => ({
  overflowX: 'hidden',
  paddingLeft: 8,
  whiteSpace: 'pre-line',
  wordBreak: 'break-word',
  fontSize: size === 'small' ? 14 : undefined
}));

const KeyValue = styled(DefaultValue)(({ theme }) => ({
  color: theme.palette.info.dark,
  fontFamily: 'monospace'
}));

const ConstValue = styled(DefaultValue)(({ theme }) => ({
  color: theme.palette.warning.dark,
  fontFamily: 'monospace'
}));

interface BooleanValueProps {
  theme?: any
  value: boolean
}
const BooleanValue = styled(DefaultValue)<BooleanValueProps>(({ theme, value }) => ({
  color: value ? theme.palette.success.dark : theme.palette.error.dark,
  fontFamily: 'monospace'
}));

const NumberValue = styled(DefaultValue)(({ theme }) => ({
  color: theme.palette.warning.dark
}));

const ScalarValue = styled(DefaultValue)(({ theme }) => ({
  color: theme.palette.success.dark
}));

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
  size?: Size,
  label: string,
  value?: ReactElement,
  children?: ReactNode
}) => {
  const theme = useTheme();

  return (
    <MuiTreeItem
      sx={{
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden'
      }}
      nodeId={nodeId}
      label={(
        <Box sx={{
          display: 'flex',
          overflowX: 'hidden'
        }}>
          <Typography sx={{
            color: theme.palette.text.secondary,
            fontWeight: 200,
            fontSize: size === 'small' ? 14 : undefined
          }}>
            {label}
          </Typography>
          <span style={{ fontSize: size === 'small' ? 14 : undefined }}>
            {value !== undefined ? ':' : ''}
          </span>
          {value}
        </Box>
      )}
    >
      {children}
    </MuiTreeItem>
  );
};

type Size = 'small' | 'medium' | undefined

// TODO(burdon): Extend MuiJsonTreeView
export interface JsonTreeViewProps {
  sx?: any
  size?: Size
  depth?: number
  data?: any
  onSelect?: () => void
}

/**
 * Visualizes an object as a tree view of all properties.
 * Works with JSON and other objects with nested values.
 */
export const JsonTreeView = ({
  sx,
  size,
  depth = Infinity,
  data = {},
  onSelect
}: JsonTreeViewProps) => {
  if (!data) {
    data = {};
  }

  const [expanded, setExpanded] = useState<string[]>([]);

  // TODO(burdon): Auto-exapnds.
  // Needed to determine if data has changed.
  const diff = JSON.stringify(data);
  useEffect(() => {
    const nodeIds = visitor(data, depth);
    setExpanded(nodeIds);
  }, [diff, depth]);

  //
  // Recursively render items.
  //
  const renderNode = (value: any, key = '', level = 0, path = ''): any => {
    if (value === undefined || value === '') {
      return;
    }

    if (isPlainObject(value)) {
      const items = Object.entries(value).map(([key, value]) => renderNode(value, key, level + 1, `${path}.${key}`)).filter(Boolean);
      return (level === 0) ? items : (
        <TreeItem
          key={path}
          nodeId={path || '.'}
          size={size}
          label={key}
        >
          {items}
        </TreeItem>
      );
    }

    if (Array.isArray(value)) {
      const items = value.map((value, key) => renderNode(value, `[${key}]`, level + 1, `${path}.${key}`)).filter(Boolean);
      return (level === 0) ? items : (
        <TreeItem
          key={path}
          nodeId={path}
          size={size}
          label={key}
        >
          {items}
        </TreeItem>
      );
    }

    // TODO(burdon): Pluggable types (eg, date, string, number, boolean, etc).
    let itemValue;
    if (value instanceof Uint8Array) {
      itemValue = <KeyValue size={size}>{truncateKey(keyToString(value), 8)}</KeyValue>;
    } else if (value instanceof PublicKey) {
      itemValue = <KeyValue size={size}>{truncateKey(value.toHex(), 8)}</KeyValue>;
    } else if (value === null) {
      itemValue = <ConstValue size={size}>null</ConstValue>;
    } else if (typeof value === 'boolean') {
      itemValue = <BooleanValue size={size} value={value}>{String(value)}</BooleanValue>;
    } else if (typeof value === 'number') {
      itemValue = <NumberValue size={size}>{String(value)}</NumberValue>;
    } else if (typeof value === 'string') {
      itemValue = <ScalarValue size={size}>{`'${value}'`}</ScalarValue>;
    } else {
      itemValue = <DefaultValue size={size}>{String(value)}</DefaultValue>;
    }

    return (
      <TreeItem
        key={path}
        nodeId={path}
        size={size}
        label={key}
        value={itemValue}
      />
    );
  };

  const handleToggle = (_event: ChangeEvent<unknown>, nodeIds: string[]) => {
    setExpanded(nodeIds);
  };

  return (
    <MuiTreeView
      sx={{
        overflowX: 'hidden',
        ...sx
      }}
      disableSelection={!onSelect}
      defaultCollapseIcon={<ExpandMoreIcon />}
      defaultExpandIcon={<ChevronRightIcon />}
      defaultEndIcon={<BulletIcon sx={{ width: 10 }} />}
      expanded={expanded}
      selected={onSelect ? [] : undefined}
      onNodeSelect={onSelect}
      onNodeToggle={handleToggle}
    >
      {renderNode(data)}
    </MuiTreeView>
  );
};
