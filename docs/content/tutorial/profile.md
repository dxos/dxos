---
title: 2. Create a Profile
description: Set Up a user profile for your application
---

After we connect our Client to our React Application, the very first step is to get the created user's profile.

## Check If a Profile Is Created

The Client stores the profile for you. You can easily check if the user created a profile by using the react hook `useProfile` provided by `@dxos/react-client`:

```js
import React from 'react';
import { useClient, useProfile } from '@dxos/react-client';

import Main from './Main';
import ProfileDialog from './ProfileDialog';

const Root = () => {
  const client = useClient();
  const profile = useProfile();

  if (!profile) {
    return <h1>No profile created yet</h1>;
  }

  return <h1>Profile is created</h1>;
};

export default Root;
```

## Create a Profile

To create a new profile we just need call the `createProfile` method from the `Halo` object contained by the `Client` instance, sending a username provided by the user and a key pair the we will generate for this specific user.

Let's create first a `ProfileDialog` to prompt the user to fill a username:

```jsx:title=src/components/ProfileDialog.jsx
import React, { useState } from 'react';

import {
  Avatar,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Toolbar,
  Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { LockOutlined as LockOutlinedIcon } from '@material-ui/icons';

const useStyles = makeStyles((theme) => ({
  avatar: {
    backgroundColor: theme.palette.secondary.main,
    marginRight: theme.spacing(2),
  },
}));

const ProfileDialog = ({ open, onClose }) => {
  const classes = useStyles();
  const [username, setUsername] = useState('');

  const handleUpdate = () => onClose({ username });

  return (
    <Dialog open={open} fullWidth maxWidth='xs'>
      <DialogTitle>
        <Toolbar variant='dense' disableGutters>
          <Avatar className={classes.avatar}>
            <LockOutlinedIcon />
          </Avatar>

          <Typography component='h1' variant='h5'>
            Create Profile
          </Typography>
        </Toolbar>
      </DialogTitle>

      <DialogContent className={classes.paper}>
        <TextField
          autoFocus
          fullWidth
          required
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          onKeyPress={(event) => event.key === 'Enter' && handleUpdate()}
          label='Username'
          variant='outlined'
          spellCheck={false}
        />
      </DialogContent>

      <DialogActions>
        <Button color='primary' disabled={!username} onClick={handleUpdate}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProfileDialog;
```

If you pay attention, we are using Material UI components to build this dialog, and for it to properly work, we will need to implement Material UI's `ThemeProvider`.
Go to your `src/App.js` component and:

```jsx:title=src/App.js
//...
import { CssBaseline } from '@material-ui/core';
import { createTheme } from '@material-ui/core/styles';
import { ThemeProvider } from '@material-ui/styles';

const baseTheme = createTheme({
  overrides: {
    MuiCssBaseline: {
      '@global': {
        body: {
          margin: 0,
          overflow: 'hidden',
        },
      },
    },
  },
  sidebar: {
    width: 300,
  },
});

const App = () => {
  return (
    <ClientInitializer config={config}>
      <ThemeProvider theme={baseTheme}>
        <CssBaseline />
        <Root />
      </ThemeProvider>
    </ClientInitializer>
  );
};

export default App;
```

Now let's go to our `src/components/Root.js` file and add the code to actually create the profile:

```jsx:title=src/components/Root.js
import React from 'react';

import { createKeyPair } from '@dxos/crypto';
import { useClient, useProfile } from '@dxos/react-client';

import Main from './Main';
import ProfileDialog from './ProfileDialog';

const Root = () => {
  const client = useClient();
  const profile = useProfile();

  if (!profile) {
    const handleRegistration = async ({ username }) => {
      if (username) {
        const { publicKey, secretKey } = createKeyPair();
        await client.halo.createProfile({ publicKey, secretKey, username });
      }
    };

    return <ProfileDialog open onClose={handleRegistration} />;
  }

  return <h1>Profile is created</h1>;
};

export default Root;
```

See your app again, you should now see:

![Tasks App - Create Profile](./introduction-00.png)

Complete with a profile name of your choice and submit the form.

<!--
This is very similar to a login or a sign up page. Jump into `ProfileModal.js`. This component is a very simple sign up form. The user has to provide a username in order to create a profile. The input element will save the state in the `username` variable and then `handleRegistration` is the invoked method when the user clicks on the `Create` button.


`handleRegistration` generates a `keypair` and sets the profile using the client. The client is retrieved by the react hook `useClient`.

```js
import React from 'react';
import { createKeyPair } from '@dxos/crypto';
import { useClient, useProfile } from '@dxos/react-client';

import Main from './Main';
import ProfileDialog from './ProfileDialog';

const Root = () => {
  const client = useClient();
  const profile = useProfile();

  if (!profile) {
    const handleRegistration = async ({ username }) => {
      if (username) {
        const { publicKey, secretKey } = createKeyPair();
        await client.createProfile({ publicKey, secretKey, username });
      }
    };

    return <ProfileDialog open onClose={handleRegistration} />;
  }

  return <Main />;
};
``` -->
