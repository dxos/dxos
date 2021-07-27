---
title: 3. Create a Party
description: Add a space for sharing data
---

A Party is the DXOS element responsible for sharing content between invited members. Each Party is identified by a `publicKey`.

## Create a Party

In this example, we use Parties to create a Task List that we'll share and invite other peers to read and then collaborate on.

Party creation is handled through the `Echo` object that is contained by the `Client` instance. After creating the party, set the title property through the `setProperty` function.

Let's create a new dialog component to handle this logic:

```jsx:title=src/components/PartySettings.js
import React, { useState } from 'react';

import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@material-ui/core';

import { useClient } from '@dxos/react-client';

const PartySettings = ({ onClose }) => {
  const client = useClient();
  const [title, setTitle] = useState('');

  const handleSubmit = async () => {
    if (!title.length) {
      return;
    }

    const party = await client.echo.createParty({ title });
    await party.setProperty('title', title);
    const partyKey = party.key;

    onClose({ partyKey });
  };

  return (
    <Dialog open fullWidth maxWidth='xs'>
      <DialogTitle>
        <Typography>Create Party</Typography>
      </DialogTitle>

      <DialogContent>
        <TextField
          fullWidth
          autoFocus
          label='Title'
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyPress={(event) => event.key === 'Enter' && handleSubmit()}
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>

        <Button onClick={handleSubmit} color='primary'>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PartySettings;
```

Now create a `PartyList` component to display a button to open the dialog (we will later display the created parties here):

```jsx:title=src/components/PartyList.js
import React, { useState } from 'react';

import { Fab } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { Add as AddIcon } from '@material-ui/icons';

import PartySettings from './PartySettings';

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  grow: {
    flex: 1,
  },
  listItem: {
    '& .actions': {
      opacity: 0.2,
    },
    '&:hover .actions': {
      opacity: 1,
    },
  },
  listItemText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  actions: {
    margin: theme.spacing(2),
    '& button': {
      marginRight: theme.spacing(1),
    },
  },
}));

const PartyList = ({ onSelectParty }) => {
  const classes = useStyles();
  const [{ settingsDialog }, setSettingsDialog] = useState({});

  const handleCreateParty = () => setSettingsDialog({ settingsDialog: true });

  return (
    <div className={classes.root}>
      {settingsDialog && (
        <PartySettings
          onClose={({ partyKey }) => {
            setSettingsDialog({});

            if (partyKey) {
              onSelectParty(partyKey);
            }
          }}
        />
      )}

      <div className={classes.grow} />

      <div className={classes.actions}>
        <Fab size='small' color='primary' aria-label='add' title='Create party' onClick={handleCreateParty}>
          <AddIcon />
        </Fab>
      </div>
    </div>
  );
};

export default PartyList;
```

Time to display this in our app. We will add some basic MUI components to make our app look prettier.

```jsx:title=src/components/Main.js
import React, { useState } from 'react';

import { AppBar, Drawer, Toolbar, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { Work as WorkIcon } from '@material-ui/icons';

import { useClient } from '@dxos/react-client';

import PartyList from './PartyList';

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
  },
  appBar: {
    zIndex: theme.zIndex.drawer + 1,
  },
  logo: {
    marginRight: theme.spacing(2),
  },
  toolbarShift: theme.mixins.toolbar,
  flexGrow: {
    flex: 1,
  },
  drawer: {
    flexShrink: 0,
    width: theme.sidebar.width,
  },
  drawerPaper: {
    width: theme.sidebar.width,
    overflow: 'auto',
  },
}));

const Main = () => {
  const classes = useStyles();
  const client = useClient();
  const [partyKey, setPartyKey] = useState();

  return (
    <div className={classes.root}>
      <AppBar position='fixed' className={classes.appBar}>
        <Toolbar>
          <WorkIcon className={classes.logo} />

          <Typography variant='h6' noWrap>
            {client.config.app.title}
          </Typography>

          <div className={classes.flexGrow} />
        </Toolbar>
      </AppBar>

      <Drawer
        variant='permanent'
        className={classes.drawer}
        classes={{
          paper: classes.drawerPaper,
        }}
      >
        <div className={classes.toolbarShift} />

        <PartyList onSelectParty={(partyKey) => setPartyKey(partyKey)} />
      </Drawer>
    </div>
  );
};

export default Main;
```

Go to your `src/components/Root.js` and render this `Main` component on the created profile section.

If you go to your app in the browser, you should now see something like:

// todo(grazianoramiro): add picture

And you should be able to open the dialog and create a new party:

// todo(grazianoramiro): add picture

## Retrieve all the Parties

You now realize that even though we are able to create a party, there's no way to see it. So let's go with it.
We can retrieve all the created Parties using the `useParties` hook provided by `@dxos/react-client`.

```jsx:title=src/components/PartyList.js
import React, { useState } from 'react';

import { Avatar, Fab, List, ListItem, ListItemAvatar, ListItemText } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { Add as AddIcon, Assignment as PartyIcon } from '@material-ui/icons';

import { useParties } from '@dxos/react-client';
import PartySettings from './PartySettings';

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  grow: {
    flex: 1,
  },
  listItem: {
    '& .actions': {
      opacity: 0.2,
    },
    '&:hover .actions': {
      opacity: 1,
    },
  },
  listItemText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  actions: {
    margin: theme.spacing(2),
    '& button': {
      marginRight: theme.spacing(1),
    },
  },
}));

const PartyList = ({ selectedPartyKey, onSelectParty }) => {
  const classes = useStyles();
  const parties = useParties();
  const [{ settingsDialog, settingsPartyKey }, setSettingsDialog] = useState({});

  const handleCreateParty = () => setSettingsDialog({ settingsDialog: true });

  return (
    <div className={classes.root}>
      {settingsDialog && (
        <PartySettings
          partyKey={settingsPartyKey}
          onClose={({ partyKey }) => {
            setSettingsDialog({});

            if (partyKey) {
              onSelectParty(partyKey);
            }
          }}
        />
      )}

      <List disablePadding>
        {parties.map((party) => (
          <ListItem
            button
            key={party.key}
            selected={selectedPartyKey === party.key}
            onClick={() => onSelectParty(party.key)}
            classes={{ container: classes.listItem }}
          >
            <ListItemAvatar>
              <Avatar>
                <PartyIcon />
              </Avatar>
            </ListItemAvatar>

            <ListItemText
              primary={party.getProperty('title')}
              classes={{
                primary: classes.listItemText,
              }}
            />
          </ListItem>
        ))}
      </List>

      <div className={classes.grow} />

      <div className={classes.actions}>
        <Fab size='small' color='primary' aria-label='add' title='Create party' onClick={handleCreateParty}>
          <AddIcon />
        </Fab>
      </div>
    </div>
  );
};

export default PartyList;
```

And in your `src/components/Main.js` send the `selectedPartyKey` prop to `PartyList`:

```jsx:title=src/components/Main.js
<PartyList selectedPartyKey={partyKey} onSelectParty={(partyKey) => setPartyKey(partyKey)} />
```

You should now be able to see your created party:

// todo(grazianoramiro): add picture

## Retrieve a Single Party

Now that we have our party created and listed, let's add the possibility to update its name. For that to happen, we will slightly tweak our `PartySettings` dialog to also support modification apart from creation.

Take a look at the code below, we are using the `useParty` hook to be able to just fetch a single party:

```jsx:title=src/components/PartySettings.js
import React, { useState } from 'react';

import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@material-ui/core';

import { useClient, useParty } from '@dxos/react-client';

const PartySettings = ({ partyKey, onClose }) => {
  const client = useClient();
  const party = useParty(partyKey);

  const [title, setTitle] = useState(party ? party.getProperty('title') : '');

  const handleUpdate = async () => {
    if (!title.length) {
      return;
    }

    if (party) {
      await party.setProperty('title', title);
    } else {
      const party = await client.echo.createParty({ title });
      await party.setProperty('title', title);
      partyKey = party.key;
    }

    onClose({ partyKey });
  };

  return (
    <Dialog open fullWidth maxWidth='xs'>
      <DialogTitle>
        <Typography>{partyKey ? 'Party Settings' : 'Create Party'}</Typography>
      </DialogTitle>

      <DialogContent>
        <TextField
          fullWidth
          autoFocus
          label='Title'
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyPress={(event) => event.key === 'Enter' && handleUpdate()}
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>

        <Button onClick={handleUpdate} color='primary'>
          {partyKey ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PartySettings;
```

The only remaining thing is to add a button to trigger this modal with the corresponding `partyKey`:

```jsx:title=src/components/PartyList.js
import React, { useState } from 'react';

import {
  Avatar,
  Fab,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemSecondaryAction,
  ListItemText,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { Add as AddIcon, Assignment as PartyIcon, Settings as SettingsIcon } from '@material-ui/icons';

import { useParties } from '@dxos/react-client';

import PartySettings from './PartySettings';

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  grow: {
    flex: 1,
  },
  listItem: {
    '& .actions': {
      opacity: 0.2,
    },
    '&:hover .actions': {
      opacity: 1,
    },
  },
  listItemText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  actions: {
    margin: theme.spacing(2),
    '& button': {
      marginRight: theme.spacing(1),
    },
  },
}));

const PartyList = ({ selectedPartyKey, onSelectParty, hideRedeem = false }) => {
  const classes = useStyles();
  const [{ settingsDialog, settingsPartyKey }, setSettingsDialog] = useState({});
  const parties = useParties();

  const handleCreateParty = () => setSettingsDialog({ settingsDialog: true });

  return (
    <div className={classes.root}>
      {settingsDialog && (
        <PartySettings
          partyKey={settingsPartyKey}
          onClose={({ partyKey }) => {
            setSettingsDialog({});
            if (partyKey) {
              onSelectParty(partyKey);
            }
          }}
        />
      )}

      <List disablePadding>
        {parties.map((party) => (
          <ListItem
            button
            key={party.key}
            selected={selectedPartyKey === party.key}
            onClick={() => onSelectParty(party.key)}
            classes={{ container: classes.listItem }}
          >
            <ListItemAvatar>
              <Avatar>
                <PartyIcon />
              </Avatar>
            </ListItemAvatar>

            <ListItemText
              primary={party.getProperty('title')}
              classes={{
                primary: classes.listItemText,
              }}
            />

            <ListItemSecondaryAction className='actions'>
              <IconButton
                size='small'
                edge='end'
                aria-label='settings'
                title='Settings'
                onClick={() => setSettingsDialog({ settingsDialog: true, settingsPartyKey: party.key })}
              >
                <SettingsIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>

      <div className={classes.grow} />

      <div className={classes.actions}>
        <Fab size='small' color='primary' aria-label='add' title='Create Party' onClick={handleCreateParty}>
          <AddIcon />
        </Fab>
      </div>
    </div>
  );
};

export default PartyList;
```

You will see a `Settings` button right next to the party name and clicking on it will open the dialog with the party name already filled in.

// todo(grazianoramiro): add picture
