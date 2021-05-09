//
// Copyright 2020 DXOS.org
//

import faker from 'faker';
import React, { useState } from 'react';

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fab,
  IconButton,
  LinearProgress,
  TextField,
  Toolbar,
  Typography
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import AddIcon from '@material-ui/icons/Add';
import GraphIcon from '@material-ui/icons/BubbleChart';
import ListIcon from '@material-ui/icons/Reorder';
import CardIcon from '@material-ui/icons/ViewComfy';
import GridIcon from '@material-ui/icons/ViewModule';

import { Party } from '@dxos/echo-db';
import {
  OBJECT_ORG,
  OBJECT_PERSON,
  OBJECT_PROJECT,
  OBJECT_TASK,
  labels,
  Generator
} from '@dxos/echo-testing';
import { ObjectModel } from '@dxos/object-model';
import { useSelection, searchSelector } from '@dxos/react-client';

import {
  CardView, GraphView, ListView, GridView, SearchBar, ItemCard, ItemDialog,
  useGenerator, graphSelector
} from '../../../src';
import { adapter, TYPES } from './adapter';

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

interface HomeProps {
  onCreate: () => void,
  onJoin: (invitationCode: string) => void
}

// TODO(burdon): Factor out.
const Home = ({ onCreate, onJoin }: HomeProps) => {
  const [invitationCode, setInvitationCode] = useState('');
  const [inProgress, setInProgress] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  return (
    <Dialog open={true} fullWidth maxWidth='sm'>
      <DialogTitle>Demo</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          value={invitationCode}
          onChange={e => setInvitationCode(e.target.value)}
          variant='outlined'
          label='Invitation code'
          spellCheck={false}
        />

        <div style={{ height: 8, marginTop: 16 }}>
          {inProgress && <LinearProgress />}
        </div>

        {error && <Typography>{String(error)}</Typography>}
      </DialogContent>
      <DialogActions>
        <Button
          color='secondary'
          variant='contained'
          onClick={async () => {
            setInProgress(true);
            setError(undefined);
            try {
              await onJoin(invitationCode);
            } catch (error) {
              setError(error);
            } finally {
              setInProgress(false);
            }
          }}
          disabled={!invitationCode || inProgress}
        >
          Join Party
        </Button>
        <Button
          color='primary'
          variant='contained'
          onClick={() => {
            setInProgress(true);
            onCreate();
          }}
          disabled={inProgress}
        >
          Create Party
        </Button>
      </DialogActions>
    </Dialog>
  );
};

interface MainProps {
  party: Party,
  generator: Generator
}

// TODO(burdon): Factor out.
const Main = ({ party, generator }: MainProps) => {
  const classes = useStyles();

  const [search, setSearch] = useState<string | undefined>(undefined);
  const items: any[] = useSelection(generator.database.select(), searchSelector(search), [search]);
  // TODO(burdon): Use subset.
  // const data = useSelection(items && new Selection(items, new Event()), graphSelector);
  const data = useSelection(generator.database.select(), graphSelector(adapter));
  const [selected, setSelected] = useState();
  const [view, setView] = useState(VIEW_LIST);

  const handleUpdate = (text: string) => setSearch(text.toLowerCase());

  const ViewButton = ({ view: type, icon: Icon }: {view: number, icon: React.FunctionComponent}) => (
    <IconButton color={type === view ? 'primary' : 'default'} size='small' onClick={() => setView(type)}>
      <Icon />
    </IconButton>
  );

  const [showCreate, setShowCreate] = useState(false);

  const handleCreate = async ({ type, name }: { type: string, name: string }) => {
    await generator.database.createItem({
      model: ObjectModel,
      type,
      props: { // TODO(burdon): Factor out generator.
        name: name,
        description: faker.lorem.sentence(),
        labels: faker.random.arrayElements(labels, faker.random.number({ min: 0, max: 3 }))
      }
    });

    setShowCreate(false);
  };

  const handleCopyInvite = async () => {
    const invitation = await party.createInvitation({
      secretProvider: async () => Buffer.from('0000'),
      secretValidator: async () => true
    });

    await navigator.clipboard.writeText(JSON.stringify(invitation.toQueryParameters()));
  };

  // TODO(burdon): Move into adapter?
  items.sort((a, b) => {
    const getType = (type: string) => {
      const TYPE_ORDER = {
        [OBJECT_ORG]: 1,
        [OBJECT_PERSON]: 2,
        [OBJECT_PROJECT]: 3,
        [OBJECT_TASK]: 4
      };

      return TYPE_ORDER[type as keyof typeof TYPE_ORDER] || Infinity;
    };

    const order = getType(a.type) < getType(b.type) ? -1 : getType(a.type) > getType(b.type) ? 1 : 0;
    if (order !== 0) {
      return order;
    }

    const titleA = a.model.getProperty('name');
    const titleB = b.model.getProperty('name');
    return titleA < titleB ? -1 : titleA > titleB ? 1 : 0;
  });

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
        <Button onClick={handleCopyInvite}>Copy invite</Button>
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

      <Fab className={classes.fab} color='primary' aria-label='add' onClick={() => setShowCreate(true)}>
        <AddIcon />
      </Fab>
    </div>
  );
};

// TODO(burdon): Implement router.

export const Primary = () => {
  const { party, generator, createParty, joinParty } = useGenerator();

  const handleCreate = async () => {
    await createParty({
      numOrgs: 4,
      numPeople: 16,
      numProjects: 6
    });
  };

  const handleJoin = async (invitationCode: string) => {
    await joinParty(invitationCode);
  };

  if (party && generator) {
    return (
      <Main party={party} generator={generator} />
    );
  }

  return (
    <Home onCreate={handleCreate} onJoin={handleJoin} />
  );
};

export default {
  title: 'Demos/Search',
  component: Primary
};
