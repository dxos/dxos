//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import React from 'react';

import * as colors from '@material-ui/core/colors';
import { makeStyles } from '@material-ui/core/styles';

import { OBJECT_ORG, OBJECT_PERSON, OBJECT_PROJECT, OBJECT_TASK } from '@dxos/echo-testing';

import {
  ItemAdapter,
  DebugItemList,
  GraphView,
  graphSelector,
  useGenerator,
  useSelection
} from '../src';

export default {
  title: 'Links',
  decorators: []
};

debug.enable('dxos:echo:story:*, dxos:*:error');

const useStyles = makeStyles(() => ({
  // TODO(burdon): Container.
  root: {
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    overflow: 'hidden',
    height: '100vh',
    backgroundColor: colors.grey[50]
  },
  items: {
    position: 'absolute',
    zIndex: 1,
    left: 0,
    top: 0,
    bottom: 0,
    overflow: 'scroll',

    color: colors.grey[700],
    '& .org': {
      color: colors.blue[700]
    },
    '& .project': {
      color: colors.orange[700]
    },
    '& .task': {
      color: colors.pink[700]
    },
    '& .person': {
      color: colors.green[700]
    }
  },
  info: {
    position: 'absolute',
    zIndex: 1,
    right: 16,
    fontFamily: 'monospace',
    color: colors.grey[700]
  }
}));

const useGraphStyles = makeStyles(() => ({
  nodes: {
    '& g.node text': {
      fill: colors.grey[700],
      fontFamily: 'sans-serif',
      fontSize: 12
    },
    '& g.node.org circle': {
      fill: colors.blue[300],
      stroke: colors.blue[700],
      strokeWidth: 3
    },
    '& g.node.project circle': {
      fill: colors.orange[300],
      stroke: colors.orange[700],
      strokeWidth: 2
    },
    '& g.node.task circle': {
      fill: colors.pink[300],
      stroke: colors.pink[700],
      strokeWidth: 2
    },
    '& g.node.person circle': {
      fill: colors.green[300],
      stroke: colors.green[700],
      strokeWidth: 1
    }
  }
}));

const propertyAdapter = (node) => ({
  class: node.type.split('/').pop(),
  radius: {
    [OBJECT_ORG]: 16,
    [OBJECT_PROJECT]: 12,
    [OBJECT_PERSON]: 8,
    [OBJECT_TASK]: 6
  }[node.type] || 8
});

const itemAdapter: ItemAdapter = {
  key: item => item.id,
  primary: item => item.model.getProperty('name')
};

const Component = ({ generator }) => {
  const classes = useStyles();
  const graphClasses = useGraphStyles();

  const data = useSelection(generator.database.select(), graphSelector(itemAdapter));
  const items = useSelection(generator.database.select(), selection => selection.items);

  const handleCreate = data => {
    if (data.nodes.length) {
      const { source } = data.links[0];
      generator.createItem(source);
    } else {
      const { source, target } = data.links[0];
      generator.linkItem(source, target);
    }
  };

  console.log(data);
  // TODO(burdon): Graph disappears.
  // events.js:46 MaxListenersExceededWarning: Possible EventEmitter memory leak detected. 11 click listeners added. Use emitter.setMaxListeners() to increase limit
  //     at _addListener (http://localhost:9001/vendors~main.715b4af2c7d2bbf95f53.bundle.js:178465:15)
  //     at EventEmitter.addListener (http://localhost:9001/vendors~main.715b4af2c7d2bbf95f53.bundle.js:178481:10)
  //     at GraphView (http://localhost:9001/main.715b4af2c7d2bbf95f53.bundle.js:10824:8)

  return (
    <div className={classes.root}>
      <div className={classes.items}>
        <DebugItemList items={items} />
      </div>

      <div className={classes.info}>
        <div>Command-drag: Org&#x2192;Person</div>
      </div>

      <GraphView
        classes={graphClasses}
        data={data}
        propertyAdapter={propertyAdapter}
        onCreate={handleCreate}
      />
    </div>
  );
};

export const withLinks = () => {
  const generator = useGenerator({
    numOrgs: 4,
    numPeople: 16,
    numProjects: 6
  });

  if (!generator) {
    return null;
  }

  return (
    <Component generator={generator} />
  );
};
