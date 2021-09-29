//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import faker from 'faker';
import React, { useState } from 'react';

import {
  Button,
  Fab,
  IconButton,
  Toolbar
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import AddIcon from '@material-ui/icons/Add';
import GraphIcon from '@material-ui/icons/BubbleChart';
import ListIcon from '@material-ui/icons/Reorder';
import CardIcon from '@material-ui/icons/ViewComfy';
import GridIcon from '@material-ui/icons/ViewModule';

import { Party } from '@dxos/echo-db';
import { labels } from '@dxos/echo-testing';
import { ObjectModel } from '@dxos/object-model';
import { useSelection, searchSelector } from '@dxos/react-client';

import {
  CardView, GraphView, ListView, GridView, SearchBar, ItemCard, ItemDialog, graphSelector
} from '../../src';
import { createAdapter, TYPES } from './adapter';

const useStyles = makeStyles(theme => ({
  // TODO(burdon): Container.
  root: {
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    overflow: 'hidden',
    height: '100vh',
    backgroundColor: theme.palette.grey[50]
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
  card: {
    position: 'absolute',
    zIndex: 100
  },
  fab: {
    margin: 0,
    top: 'auto',
    right: theme.spacing(2),
    bottom: theme.spacing(2),
    left: 'auto',
    position: 'fixed'
  }
}));

const VIEW_LIST = 1;
const VIEW_CARDS = 2;
const VIEW_GRID = 3;
const VIEW_GRAPH = 4;

interface MainProps {
  party: Party
  code?: string
}

// TODO(burdon): Factor out.
const Main = ({ party, code }: MainProps) => {
  const classes = useStyles();

  const [adapter] = useState(createAdapter(party.database));
  const [search, setSearch] = useState<string | undefined>(undefined);
  const items: any[] = useSelection(party.database.select(searchSelector(search)), [search]);
  if (adapter.sort) {
    items.sort(adapter.sort);
  }

  // TODO(burdon): Use subset.
  // const data = useSelection(items && new Selection(items, new Event()), graphSelector);
  const data = useSelection(party.database.select(graphSelector(adapter)));
  const [selected, setSelected] = useState();
  const [view, setView] = useState(VIEW_LIST);

  const handleUpdate = (text: string) => setSearch(text.toLowerCase());

  const ViewButton = ({ view: type, icon: Icon }: {view: number, icon: React.FunctionComponent}) => (
    <IconButton color={type === view ? 'primary' : 'default'} size="small" onClick={() => setView(type)}>
      <Icon />
    </IconButton>
  );

  const [showCreate, setShowCreate] = useState(false);

  // TODO(burdon): Reconcile with adapter.
  const handleCreate = async ({ type, name }: { type: string, name: string }) => {
    const item = await party.database.createItem({
      model: ObjectModel,
      type,
      props: {
        name: name,
        description: faker.lorem.sentence(),
        labels: faker.random.arrayElements(labels, faker.random.number({ min: 0, max: 3 }))
      }
    });

    setShowCreate(false);
    return item;
  };

  const handleCopyInvite = async () => {
    assert(code);
    const invitation = await party.createInvitation({
      secretProvider: async () => Buffer.from(code),
      secretValidator: async () => true
    });

    const invitationText = JSON.stringify(invitation.toQueryParameters());
    await navigator.clipboard.writeText(invitationText);
    console.log(invitationText); // Console log is required for E2E tests.
  };

  // TODO(burdon): Show/hide components to maintain state (and test subscriptions). Show for first time on select.
  return (
    <div className={classes.root}>
      <Toolbar variant="dense" disableGutters classes={{ root: classes.toolbar }}>
        <SearchBar onUpdate={handleUpdate} />
        <div className={classes.buttons}>
          <ViewButton view={VIEW_LIST} icon={ListIcon} />
          <ViewButton view={VIEW_CARDS} icon={CardIcon} />
          <ViewButton view={VIEW_GRID} icon={GridIcon} />
          <ViewButton view={VIEW_GRAPH} icon={GraphIcon} />
        </div>
        {code && (
          <Button onClick={handleCopyInvite}>Copy invite</Button>
        )}
      </Toolbar>

      <div className={classes.content}>
        {view === VIEW_LIST && (
          <ListView
            adapter={adapter}
            items={items}
          />
        )}
        {view === VIEW_CARDS && (
          <CardView
            adapter={adapter}
            items={items}
          />
        )}
        {view === VIEW_GRID && (
          <GridView
            adapter={adapter}
            items={items}
          />
        )}
        {view === VIEW_GRAPH && (
          <>
            {selected && (
              <div className={classes.card}>
                <ItemCard
                  adapter={adapter}
                  item={selected}
                />
              </div>
            )}
            <GraphView
              data={data ?? { nodes: [], links: [] }}
              onSelect={(id: string) => setSelected(items.find(item => item.id === id))}
            />
          </>
        )}
      </div>

      <ItemDialog
        open={showCreate}
        types={TYPES}
        handleCreate={handleCreate}
        handleClose={() => setShowCreate(false)}
      />

      <Fab className={classes.fab} color="primary" aria-label="add" onClick={() => setShowCreate(true)}>
        <AddIcon />
      </Fab>
    </div>
  );
};

export default Main;
