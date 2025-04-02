---
position: 6
label: Create A Frame
---

# Create A Frame

We're going to be building a simple but practical example of a tasks list.

In this section we will make use of another CLI extension, the app extension. If you have not completed the [development environment setup](./dev-environment), you'll need to do that now. You can install this extension by running:

```bash
dx extension install @dxos/cli-app
```

## What Is A Frame?

TODO simplify, true but don't get into the details

A frame is Javascript module which can be loaded dynamically into a host application and interoperate with the host. At minimum a frame consists of a React component, then optionally defines additional functionality to facilitate interacting the host application and ECHO. Similar to how React components are composed to build a larger application, frames can be composed in a host application expand it's functionality.

TODO link to frame architecture docs

## Setup Project

The easiest way to get started building a frame is to clone the frame template:

TODO make JS frame template
TODO use api box to show both ts and js examples

```bash
dx app create --template https://github.com/dxos/templates/tree/main/frame-template --path dxos-intro
```

Once we've cloned the template we'll want to install the dependencies:

```bash
cd dxos-intro
yarn
```

> NOTE: `yarn` is required here due to a dependency issue with `wrtc` which causes `npm install` to fail.

After the dependencies are installed we can run the storybook to see the placeholder frame content:

```bash
yarn book
```

> NOTE: the frame template does not use StorybookJS but a stripped down implementation of stories built using esbuild. The details are not included here as they are not relevant to this tutorial but you can find more information on this tool here: [@dxos/esbuild-server](https://github.com/dxos/esbuild-server).

## Update Dependencies

TODO update template frame so that this section can be omitted from this basic tutorial

The first thing we need to do is add a couple of additional DXOS dependencies that we will need: `@dxos/document-model` and `@dxos/echo-db`. We want to match the version of the `@dxos/react-client` for these dependencies and they should be added to the `devDependencies` and `peerDependencies`. The reason we aren't adding these to the regular dependencies list is that we expect that they will be provided by the frame host whenever the frame is loaded. If they were non-standard dependencies we would want to add them to the `dependencies` list and bundle them with the frame.

After adding those dependencies to the `package.json`, don't forget to run `yarn` again to install them.

## Frame Manifest

The first thing we need to do is update our frame's manifest. The manifest of a frame is what is loaded by applications using the frame, telling them what the frame is capable of. Let's walk through the manifest that comes with the template frame.

TODO link to frame manifest api reference

This is about the simplest manifest that we can create, it provides only the `component` which is used to render the frame. Frames always wrap their main component in `createDynamicFrame` which provides the frames with necessary React contexts to operate.

TODO createDynamicFrame vs createFrame

```ts
import { createDynamicFrame, FrameManifest } from '@dxos/react-framekit';

import { Main } from './Main';

export const manifest: FrameManifest = {
  component: createDynamicFrame(Main)
};
```

In order to make an interactive frame we need to implement the `register` and `createRootItem` functions in the manifest -- we'll start with `register`. The `register` function registers ECHO models that our frames rely on, but creating your own models is a more advanced ECHO topic. To get started we can simply always register the `DocumentModel` which causes the items in ECHO to behave the same as Javascript objects. 

```ts
import { DocumentModel } from '@dxos/document-model';

export const manifest: FrameManifest = {
  component: createDynamicFrame(Main),
  register: async (client) => {
    client.registerModel(DocumentModel);
  }
};
```

Two key concepts of ECHO are spaces and items. In short, a space is a shared database containing queryable graph of items. The `createRootItem` function should create an item which corresponds to a single instance of the frame. It will be called with the space which the item should be created in and the initial properties of that item.

TODO link to ECHO docs on spaces/items.

We need to pass a few options to `createItem`, let's walk through what those are:

- `type`: a string defined by us which will we can use to query for items later.
- `model`: defines the structure of the item (`DocumentModel` is the most common model, it behaves analogously to a Javascript object).
- `props`: initial state of the item.

Finally, we need to return the item we've created.

> NOTE: ECHO APIs which mutate data, such as creating an item or setting a property, are async and return promises.

```ts
const TYPE_TASKS_LIST = 'example:type.tasks.list';

export const manifest: FrameManifest = {
  component: createFrame(Main),
  register: async (client) => {
    client.registerModel(DocumentModel);
  },
  createRootItem: async (space, props) => {
    const item = await space.database.createItem({
      type: TYPE_TASKS_LIST,
      model: DocumentModel,
      props
    });

    return item;
  }
};
```

## Implement Tasks List

### Material UI

Once we've got our dependencies updated we can start to work on implementing our tasks list. To start we'll add all the React and Material UI (MUI) dependencies we'll need. We'll use MUI to build our frame in order to create a nice user experience without needing to focus on the interface too much.

```tsx
import React, { ChangeEvent, useState } from 'react';

import { Add as AddIcon } from '@mui/icons-material';
import {
  Box, Checkbox, IconButton, List, ListItem, ListItemIcon, ListItemSecondaryAction, ListItemText, TextField
} from '@mui/material';
```

Now lets start to setup the structure for our tasks list. We'll want a list and the first item in the list will be a text field to create new tasks. If you are still running the storybook, you should now be able to see a text field and icon rendered.

```tsx
return (
  <List dense>
    <ListItem>
      <ListItemIcon />
      <TextField
        fullWidth
        autoFocus
        variant='standard'
      />
      <ListItemSecondaryAction>
        <IconButton size='small'>
          <AddIcon />
        </IconButton>
      </ListItemSecondaryAction>
    </ListItem>
  </List>
);
```

### Create Tasks

Next we want to make our text field useful and add some tasks. The most important piece here is the `useFrameContext` hook. The frame context makes available an ECHO space and item to the frame, the item provided is the specific item relevant to our frame.

We'll need both the space and item in order for the frame to operate properly so if either are missing we won't render anything for now.

There's also one other piece of state we need and that will be used to manage the new task input. With that in place we just need to go about creating tasks.

The last piece is an event handler which will create a new item in the space. The aside from using a different type, the only difference between this and the root item is that this item references the root item as it's parent.

```tsx
import { DocumentModel } from '@dxos/document-model';
import { useFrameContext } from '@dxos/react-framekit';

const TYPE_TASKS_TASK = 'example:type.tasks.task';

// ...

const { space, item } = useFrameContext();
const [newTask, setNewTask] = useState('');

if (!space || !item) {
  return null;
}

const handleCreateTask = async () => {
  if (!newTask.length) {
    return;
  }

  await space.database.createItem({
    type: TYPE_TASKS_TASK,
    model: DocumentModel,
    parent: item.id,
    props: {
      title: newTask
    }
  });

  setNewTask('');
};
```

Now we'll hook up the state and event handlers that we just defined with the text field.

```tsx
return (
  <List dense>
    <ListItem>
      <ListItemIcon />
      <TextField
        fullWidth
        autoFocus
        value={newTask}
        variant='standard'
        onChange={event => setNewTask(event.target.value)}
        onKeyPress={event => (event.key === 'Enter') && handleCreateTask()}
      />
      <ListItemSecondaryAction>
        <IconButton
          size='small'
          onClick={handleCreateTask}
        >
          <AddIcon />
        </IconButton>
      </ListItemSecondaryAction>
    </ListItem>
  </List>
);
```

### Render Tasks

With that in place we'll be able to create new tasks, but it still appears as if nothing is happening. We need to query the database to retrieve the tasks we create and render them. To query the database, we'll use the selection API from the space and the `useSelection` hook which returns a reactive result of the query.

TODO link to ECHO api reference for `useSelection`

In our frame, we're specifically interested in items which are tasks, so we'll filter for only the tasks type that we defined earlier. Now we have a list of tasks which we can render in the tasks list.

<!-- Add filter by parent id once that is working in frames. -->

```tsx
import { useSelection } from '@dxos/react-client';

// ...

const tasks = useSelection(space?.database.select(selection => selection
  .filter({ type: TYPE_TASKS_TASK })
  .items
), [space, item]) ?? [];
```

When creating a new task we set the `title` property on that item with the value of that task. Here we will read that property from the item in order to display the task.

```tsx
<Box>
  {tasks.map((item) => (
    <ListItem key={item.id}>
      <ListItemText primary={item.model.getProperty('title')} />
    </ListItem>
  ))}
</Box>
```

### Complete Tasks

We're able to add tasks to our task list now, but a task list isn't very useful if we can't mark them as completed. Let's add a checkbox beside each of our tasks so that we can mark them as completed.

We'll store whether or not each task has been completed as a property on that item, similar to the title. When the checkbox is toggled correspondingly we'll toggle the completed property.

```tsx
import type { Item } from '@dxos/echo-db';

// ...

const handleToggleComplete = async (item: Item<DocumentModel>, complete: boolean) => {
  await item.model.setProperty('complete', complete);
};

// ...

<ListItem key={item.id}>
  <ListItemIcon>
    <Checkbox
      checked={item.model.getProperty('complete') || false}
      onChange={(event) => handleToggleComplete(item, event.target.checked)}
    />
  </ListItemIcon>
  <ListItemText primary={item.model.getProperty('title')} />
</ListItem>
```

That's it, we now have a fully functioning task list!
