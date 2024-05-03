---
title: Creating the user profile
sidebar_title: 2. Creating the user profile
description: Managing users
---

After we connect a Client to our React Application, the very first step is to get the user's profile.

## Check If a profile exists

The Client stores the profile for you. You can easily check if the user has already created a profile by using the react hook `useProfile` provided by `@dxos/react-client`:

```jsx:title=src/components/Root.js
/*  React imports  */ 

import { useClient, useProfile } from '@dxos/react-client';

const Root = () => {
  const client = useClient();
  const profile = useProfile();

  if (!profile) {
    return <h1>No profile created yet</h1>;
  }

  return <h1>Identity created</h1>;
};
```

## Create a profile

Identity creation is handled through the `client.halo` object. We need to send a username provided by the user.

Now let's go to our `src/components/Root.js` file and add the code to actually create the profile:

```jsx:title=src/components/Root.js
import { useClient, useProfile } from '@dxos/react-client';
import { ProfileDialog } from '@dxos/react-toolkit';

const Root = () => {
  const client = useClient();
  const profile = useProfile();

  if (!profile) {
    const handleRegistration = async ({ username }) => {
      if (username) {
        await client.halo.createIdentity({ username });
      }
    };

    return <ProfileDialog open onCreate={handleRegistration} />;
  }

  return JSON.stringify(profile);
};
```

> You can see our ProfileDialog component on [Github](https://github.com/dxos/tutorial-tasks-app/blob/master/src/components/ProfileDialog.js).

See your app again, you should now see:

![Tasks App - Create Identity](images/introduction-00.png)

> If you see already created profile but not the dialog itself you can use your storage clearing extension to clear all data from the previous step.

Complete with a profile name of your choice and submit the form.
