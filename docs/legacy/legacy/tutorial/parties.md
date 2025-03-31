---
title: Managing realtime data
sidebar_title: 3. Managing realtime data
description: Creating and managing spaces
---

DXOS applications store realtime data within secure ECHO database instances called spaces.

Spaces can be shared between users and applications synchronize updates to spaces in real time across the peer-to-peer MESH network.

## Create a space

In this example, each space will represent a Task List that we'll share and invite other peers to collaborate on.

space creation is handled through the `client.echo` object. After creating the space, we need to set the title property through the `setProperty` function.

Let's create a new dialog component to handle this logic:

```jsx:title=src/components/spaceSettings.js
import { useClient } from '@dxos/react-client';

const spaceSettings = ({ space_key = undefined, onClose }) => {
  const client = useClient();
  const [title, setTitle] = useState('');

  const handleSubmit = async () => {
    const space = await client.echo.createspace({ title });
    await space.setProperty('title', title);
    onClose();
  };

  return <Dialog />;
};
```

> You can access [this](https://github.com/dxos/tutorial-tasks-app/blob/master/src/components/spaceSettings.js) link to get the code of `Dialog`.

Now, create a `spaceList` with a button to open the dialog (we will later display the created spaces here):

```jsx:title=src/components/spaceList.js
import { useSpaces } from '@dxos/react-client';

import spaceSettings from './spaceSettings';

const spaceList = ({}) => {
  const [{ settingsDialog }, setSettingsDialog] = useState({});

  const handleCreatespace = () => setSettingsDialog({ settingsDialog: true });

  return (
    <div>
      {settingsDialog && <spaceSettings onClose={() => setSettingsDialog({})}/>}

      <div>
        <Fab size='small' color='primary' aria-label='add' title='Create list' onClick={handleCreatespace}>
          <AddIcon />
        </Fab>
      </div>
    </div>
  );
};
```

Finally, create a [`Main`](https://github.com/dxos/tutorial-tasks-app/blob/master/src/components/Main.js) component to give our app some layout.

> - At this point, we haven't created the `TaskList` component yet. Therefore, you can skip this import by now commenting out its respective codes;
> - If you face any problem with `confirm()` function, you can try using `window.confirm()`.

Go to your `src/components/Root.js` and render the `Main` component on the created profile section.

If you go to your app in the browser, you should be able to open the dialog and create a new space:

![space](images/space-01.png)

## Fetch Spaces

You may have realized that even though we are able to create a space, there's no way to see it yet. So let's make it happen.

We can fetch all the created Spaces using the `useSpaces` hook provided by `@dxos/react-client`.

```jsx:title=src/components/spaceList.js
import { useSpaces } from '@dxos/react-client';

const spaceList = ({}) => {
  const spaces = useSpaces();

  // ...

  return (
    <div>
      {/* ...  */}

      <List disablePadding>
        {spaces.map((space) => (
          <ListItem button key={space.key}>
            <ListItemText primary={space.properties.name} />
          </ListItem>
        ))}
      </List>

      {/* ... Fab Button  */}
    </div>
  );
};
```

You should now be able to see your created space. You can add your own icons and styling to the list.

![space](images/space-02.png)

## Fetch Single space

Now that we have our space created and listed, let's add the possibility to update its name. For that to happen, we will slightly tweak our `spaceSettings` dialog to also support modification apart from creation.

Take a look at the code below, we are using the `usespace` hook to be able to just fetch a single space:

```jsx:title=src/components/spaceSettings.js
import { useClient, usespace } from '@dxos/react-client';

const spaceSettings = ({ space_key = undefined, onClose }) => {
  const client = useClient();
  const space = usespace(space_key);

  const [title, setTitle] = useState(space ? space.properties.name : '');

  const handleSubmit = async () => {
    if (space) {
      await space.setProperty('title', title);
    } else {
      const space = await client.echo.createspace({ title });
      await space.setProperty('title', title);
    }

    onClose({ space_key });
  };

  return <Dialog />;
};
```

You are going to need to add a button to each space to trigger the dialog and send the `space_key` of the selected space to the `spaceSettings` dialog.

```jsx:title=src/components/spaceList.js
import { useSpaces } from '@dxos/react-client';

const spaceList = ({ onSelectspace }) => {
  const [{ settingsDialog, settingsspaceKey }, setSettingsDialog] = useState({});

  const spaces = useSpaces();

  // ...

  return (
    <div>
      {settingsDialog && <spaceSettings space_key={settingsspaceKey} onClose={() => setSettingsDialog({})} />}

      <List disablePadding>
        {spaces.map((space) => (
          <ListItem button key={space.key} onClick={() => { onSelectspace(space.key) }}>
            <ListItemText primary={space.properties.name} />

            <ListItemSecondaryAction className='actions'>
              <IconButton
                size='small'
                edge='end'
                aria-label='settings'
                title='Settings'
                onClick={() => setSettingsDialog({ settingsDialog: true, settingsspaceKey: space.key })}
              >
                <SettingsIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>

      {/* ... Fab Button  */}
    </div>
  );
};
```

![space](images/space-03.png)
