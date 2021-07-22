//
// Copyright 2020 DXOS.org
//

import clsx from 'clsx';
import isPlainObject from 'lodash.isplainobject';
import React, { useEffect, useState } from 'react';

import Typography from '@material-ui/core/Typography';
import { makeStyles, Theme } from '@material-ui/core/styles';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import MuiTreeItem from '@material-ui/lab/TreeItem';
import MuiTreeView from '@material-ui/lab/TreeView';

import { keyToString } from '@dxos/crypto';
import { truncateString } from '@dxos/debug';

const useStyles = makeStyles((theme: Theme) => ({
  root: {
    overflowX: 'hidden'
  },

  itemRoot: {
    display: 'flex',
    flexDirection: 'column',
    overflowX: 'hidden'
  },

  labelRoot: {
    display: 'flex',
    overflowX: 'hidden'
  },

  label: ({ fontSize }: { fontSize?: string }) => ({
    fontSize: fontSize === 'small' ? 14 : undefined
  }),

  value: ({ fontSize }: { fontSize?: string }) => ({
    overflowX: 'hidden',
    paddingLeft: 8,
    whiteSpace: 'pre-line',
    wordBreak: 'break-word',
    fontSize: fontSize === 'small' ? 14 : undefined
  }),

  keystr: {
    color: theme.palette.info.main,
    fontFamily: 'monospace'
  },

  boolean: {
    color: theme.palette.info.main
  }
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
  className,
  nodeId,
  size,
  label,
  value,
  children
}: {
  className?: string,
  nodeId: string,
  size: string | undefined,
  label: string,
  value?: any,
  children?: React.ReactNode
}) => {
  const classes = useStyles({ fontSize: size });

  return (
    <MuiTreeItem
      nodeId={nodeId}
      classes={{ root: classes.itemRoot }}
      label={(
        <div className={classes.labelRoot}>
          <Typography classes={{ root: classes.label }} color='primary'>{label}</Typography>
          {value !== undefined && (
            <Typography classes={{ root: clsx(classes.value, className) }}>{String(value)}</Typography>
          )}
        </div>
      )}
    >
      {children}
    </MuiTreeItem>
  );
};

interface JsonTreeViewProperties {
  className?: string
  data?: any
  depth?: number
  onSelect?: () => void
  root?: string
  size?: string
}

const JsonTreeView = ({
  className = undefined,
  data = {},
  depth = Infinity,
  onSelect = () => {},
  root,
  size
}: JsonTreeViewProperties) => {
  const classes = useStyles({ fontSize: size });
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
        : (
        <TreeItem size={size} key={path} nodeId={path || '.'} label={key}>{items}</TreeItem>
          );
    }

    if (Array.isArray(value)) {
      const items = value.map((value, key) => renderNode(value, `[${key}]`, level + 1, `${path}.${key}`)).filter(Boolean);
      return (!root && level === 0)
        ? items
        : (
        <TreeItem size={size} key={path} nodeId={path} label={key}>{items}</TreeItem>
          );
    }

    // TODO(burdon): Pluggable types (e.g., date, string, number, boolean, etc).
    let className = classes.value;
    if (value instanceof Uint8Array) {
      value = truncateString(keyToString(value), 16);
      className = classes.keystr;
    } else if (typeof value === 'boolean') {
      className = classes.boolean;
    }

    return (
      <TreeItem className={className} size={size} key={path} nodeId={path} label={key} value={value} />
    );
  };

  const handleToggle = (_event: React.ChangeEvent<unknown>, nodeIds: string[]) => {
    setExpanded(nodeIds);
  };

  // TODO(burdon): Controller
  return (
    <MuiTreeView
      classes={{ root: clsx(classes.root, className) }}
      defaultCollapseIcon={<ExpandMoreIcon />}
      defaultExpandIcon={<ChevronRightIcon />}
      onNodeSelect={onSelect}
      onNodeToggle={handleToggle}
      expanded={expanded}
      selected={[]}
    >
      {renderNode(data, root || '')}
    </MuiTreeView>
  );
};

export default JsonTreeView;
