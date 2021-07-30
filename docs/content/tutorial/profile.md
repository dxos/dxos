---
title: Creating the user's profile
---

After we connect a Client to our React Application, the very first step is to get the user's profile.

## Check If a Profile Is Created

The Client stores the profile for you. You can easily check if the user has already created a profile by using the react hook `useProfile` provided by `@dxos/react-client`:

```jsx:title=src/components/Root.js
import React from 'react';
import { useClient, useProfile } from '@dxos/react-client';

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

Profile creation is handled through the `client.halo` object. We need to send a username provided by the user and a key pair the we will generate for it.

Let's first create a `ProfileDialog` to prompt the user to fill in a username:

```jsx:title=src/components/ProfileDialog.js
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

  const handleSubmit = () => onClose({ username });

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
          onKeyPress={(event) => event.key === 'Enter' && handleSubmit()}
          label='Username'
          variant='outlined'
          spellCheck={false}
        />
      </DialogContent>

      <DialogActions>
        <Button color='primary' disabled={!username} onClick={handleSubmit}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProfileDialog;
```

As we are starting to use Material UI components, we would also add a [ThemeProvider](https://material-ui.com/customization/theming/#theme-provider) to our app to be able to customize the theme.

In your `src/App.js` component add:

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

import ProfileDialog from './ProfileDialog';

const Root = () => {
  const client = useClient();
  const profile = useProfile();

  if (!profile) {
    const handleRegistration = async ({ username }) => {
      if (username) {
        // TODO(burdon): API should have defaults for keys (not require crypto).
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

As mentioned above, we are using `client.halo.createProfile()` function to create a new profile for the user, and `createKeyPair` from `@dxos/crypto` to generate a new public and secret key for this user.

See your app again, you should now see:

![Tasks App - Create Profile](./images/introduction-00.png)

Complete with a profile name of your choice and submit the form.
