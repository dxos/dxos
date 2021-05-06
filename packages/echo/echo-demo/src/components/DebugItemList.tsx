//
// Copyright 2020 DXOS.org
//

import clsx from 'clsx';
import React from 'react';

import { makeStyles } from '@material-ui/core/styles';

import { Item } from '@dxos/echo-db';

const useStyles = makeStyles(() => ({
  root: {
    backgroundColor: 'white',
    opacity: 0.7,
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#666',
    '& th': {
      textAlign: 'left',
      fontWeight: 100
    }
  },
  light: {
    color: '#DDD'
  }
}));

/**
 * Items panel.
 */
const DebugItemList = ({ items = [] }: {items?: Item<any>[]}) => {
  const classes = useStyles();
  if (!items.length) {
    return null;
  }

  const sorter = (a, b) => {
    const ta = a.type;
    const tb = b.type;
    return ta < tb ? -1 : tb > ta ? 1 : 0;
  };

  return (
    <div className={classes.root}>
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Title</th>
            <th>Child</th>
            <th>Links</th>
            <th>Refs</th>
          </tr>
        </thead>
        <tbody>
          {items.sort(sorter).map(item => (
            <tr key={item.id}>
              <td className={item.type?.split('/').pop()}>
                {item.type}
              </td>
              <td>
                {item.model.getProperty('name')}
              </td>
              <td className={clsx(!item.children.length && classes.light)}>
                {item.children.length}
              </td>
              <td className={clsx(!item.links.length && classes.light)}>
                {item.links.length}
              </td>
              <td className={clsx(!item.refs.length && classes.light)}>
                {item.refs.length}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DebugItemList;
