//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { Chip, IconButton, Toolbar, Typography } from '@material-ui/core';
import grey from '@material-ui/core/colors/grey';
import { makeStyles } from '@material-ui/core/styles';
import GraphIcon from '@material-ui/icons/BubbleChart';
import OrgIcon from '@material-ui/icons/Business';
import DefaultIcon from '@material-ui/icons/CheckBoxOutlineBlank';
import PersonIcon from '@material-ui/icons/PersonOutline';
import ListIcon from '@material-ui/icons/Reorder';
import CardIcon from '@material-ui/icons/ViewComfy';
import GridIcon from '@material-ui/icons/ViewModule';
import ProjectIcon from '@material-ui/icons/WorkOutline';

import { OBJECT_ORG, OBJECT_PERSON, OBJECT_PROJECT, LINK_PROJECT, LINK_EMPLOYEE } from '@dxos/echo-testing';

import {
  CardView, GraphView, ListView, GridView, SearchBar, ItemCard, CardAdapter, ItemAdapter,
  useGenerator, useSelection, graphSelector, searchSelector
} from '../src';

export default {
  title: 'Search'
};

const useStyles = makeStyles(theme => ({
  // TODO(burdon): Container.
  root: {
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    overflow: 'hidden',
    height: '100vh',
    backgroundColor: grey[50]
  },
  toolbar: {
    display: 'flex',
    flexShrink: 0,
    padding: theme.spacing(1)
  },
  search: {
    flex: 1
  },
  buttons: {
    paddingLeft: theme.spacing(2)
  },
  content: {
    display: 'flex',
    flex: 1,
    overflow: 'auto',
    margin: theme.spacing(1)
  },
  sublist: {
    marginTop: theme.spacing(1),
    '& table': {
      tableLayout: 'fixed',
      borderCollapse: 'collapse',
      borderSpacing: 0
    }
  },
  subheader: {
    color: theme.palette.info.dark
  },
  card: {
    position: 'absolute',
    zIndex: 100
  },
  chips: {
    marginTop: theme.spacing(2)
  },
  chip: {
    height: 20,
    padding: 2,
    marginRight: 4,
    borderRadius: 6,
    '& span': {
      paddingLeft: 6,
      paddingRight: 6,
      fontSize: 12
    }
  }
}));

const VIEW_LIST = 1;
const VIEW_CARDS = 2;
const VIEW_GRID = 3;
const VIEW_GRAPH = 4;

const icons = {
  [OBJECT_ORG]: OrgIcon,
  [OBJECT_PERSON]: PersonIcon,
  [OBJECT_PROJECT]: ProjectIcon
};

const Icon = ({ item: { type } }) => {
  const Icon = icons[type] || DefaultIcon;
  if (!Icon) {
    return null;
  }

  return <Icon />;
};

const itemAdapter: ItemAdapter = {
  key: item => item.id,
  primary: item => item.model.getProperty('name'),
  secondary: item => item.model.getProperty('description'),
  icon: Icon
};

const cardAdapter = (classes): CardAdapter => ({
  key: item => item.id,
  primary: item => item.model.getProperty('name'),
  secondary: item => item.model.getProperty('description'),
  icon: Icon,
  slices: item => {
    // TODO(burdon): Default value in getter.
    const labels = item.model.getProperty('labels') || {};

    // Sublist.
    const List = ({ items, title }) => (
      <div className={classes.sublist}>
        <Typography variant='caption' className={classes.subheader}>{title}</Typography>
        <table>
          <tbody>
            {items.map(item => (
              <tr key={item.id} >
                <td>
                  <Typography variant='body2'>&#x2022;</Typography>
                </td>
                <td>
                  <Typography variant='body2'>
                    {item.model.getProperty('name')}
                  </Typography>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

    // TODO(burdon): Add/remove labels.
    const Labels = ({ labels }) => {
      return (
        <div className={classes.chips}>
          {Object.values(labels).map((label, i) => (
            <Chip key={i} label={label} className={classes.chip} />
          ))}
        </div>
      );
    };

    const slices = [];
    switch (item.type) {
      case OBJECT_ORG: {
        const projects = item.select().links({ type: LINK_PROJECT }).target().items;
        if (projects.length !== 0) {
          slices.push(<List items={projects} title='Projects' />);
        }

        const employees = item.select().links({ type: LINK_EMPLOYEE }).target().items;
        if (employees.length !== 0) {
          slices.push(<List items={employees} title='Employees' />);
        }
        break;
      }

      case OBJECT_PROJECT: {
        const tasks = item.select().children().items;
        if (tasks.length !== 0) {
          slices.push(<List items={tasks} title='Tasks' />);
        }
        break;
      }
    }

    slices.push(<Labels labels={labels} />);

    return slices;
  }
});

export const withSearch = () => {
  const classes = useStyles();
  const generator = useGenerator({
    numOrgs: 10,
    numPeople: 20,
    numProjects: 20,
    numTasks: 30
  });
  const [search, setSearch] = useState(undefined);
  const items = useSelection(generator && generator.database.select(), searchSelector(search), [search]);
  // TODO(burdon): Use subset.
  // console.log(items);
  // const data = useSelection(items && new Selection(items, new Event()), graphSelector);
  const data = useSelection(generator && generator.database.select(), graphSelector(itemAdapter));
  const [selected, setSelected] = useState();
  const [view, setView] = useState(VIEW_LIST);

  const handleUpdate = text => setSearch(text.toLowerCase());

  const ViewButton = ({ view: type, icon: Icon }) => (
    <IconButton color={type === view ? 'primary' : 'default'} size='small' onClick={() => setView(type)}>
      <Icon />
    </IconButton>
  );

  // TODO(burdon): Show/hide components to maintain state (and test subscriptions). Show for first time on select.
  return (
    <div className={classes.root}>
      <Toolbar variant='dense' disableGutters classes={{ root: classes.toolbar }}>
        <SearchBar onUpdate={handleUpdate} />
        <div className={classes.buttons}>
          <ViewButton view={VIEW_LIST} icon={ListIcon} />
          <ViewButton view={VIEW_CARDS} icon={CardIcon} />
          <ViewButton view={VIEW_GRID} icon={GridIcon} />
          <ViewButton view={VIEW_GRAPH} icon={GraphIcon} />
        </div>
      </Toolbar>

      <div className={classes.content}>
        {view === VIEW_LIST && (
          <ListView
            adapter={itemAdapter}
            items={items}
          />
        )}
        {view === VIEW_CARDS && (
          <CardView
            adapter={cardAdapter(classes)}
            items={items}
          />
        )}
        {view === VIEW_GRID && (
          <GridView
            adapter={itemAdapter}
            items={items}
          />
        )}
        {view === VIEW_GRAPH && (
          <>
            {selected && (
              <div className={classes.card}>
                <ItemCard
                  adapter={cardAdapter(classes)}
                  item={selected}
                />
              </div>
            )}
            <GraphView
              data={data}
              onSelect={id => setSelected(items.find(item => item.id === id))}
            />
          </>
        )}
      </div>
    </div>
  );
};
