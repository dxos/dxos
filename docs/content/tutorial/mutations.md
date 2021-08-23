---
title: Creating and updating data
sidebar_title: 4. Creating and updating data
description: 
---

So far, we have been preparing our app to be able to interact with DXOS Stack, but we haven't added any fun logic yet. 
Let's add some more stuff to our `src/components/TaskList.js` file.

## Creating items

On our app the `items` that we are going to create are going to be Tasks. 
Add the following code to your `TaskList` component and take a look at the function `handleCreateItem`. We are calling to `party.database.createItem` function, sending some required information.

```jsx:title=src/components/TaskList.js
import { ObjectModel } from '@dxos/object-model';
import { useParty } from '@dxos/react-client';

const TASK_TYPE = 'example.com/type/task';

const TaskList = ({ partyKey }) => {
  const [taskTitle, setTaskTitle] = useState('');

  const party = useParty(partyKey);

  const handleCreateTask = async () => {
    await party.database.createItem({
      type: TASK_TYPE,
      model: ObjectModel,
      props: { title: taskTitle },
    });

    setTaskTitle('');
  };

  // ...

  return (
    <div>
      <List dense>
        <ListItem>
          <ListItemIcon />

          <TextField
            fullWidth
            autoFocus
            value={taskTitle}
            onChange={(event) => setTaskTitle(event.target.value)}
            onKeyPress={(event) => event.key === 'Enter' && handleCreateTask()}
          />

          <ListItemSecondaryAction>
            <IconButton size='small' edge='end' aria-label='create' onClick={handleCreateTask}>
              <AddIcon />
            </IconButton>
          </ListItemSecondaryAction>
        </ListItem>
      </List>

      {/* ... Share Button */}
    </div>
  );
};
```

![data](images/data-02.png)

## Updating items

Let's add the possibility to check/uncheck our tasks to mark which ones are already completed. Pay attention to `handleToggleComplete` and you will see how we update a property of an item:

```jsx:title=src/components/TaskList.js
import { ObjectModel } from '@dxos/object-model';
import { useParty, useSelection } from '@dxos/react-client';

const TASK_TYPE = 'example.com/type/task';

const TaskList = ({ partyKey }) => {
  // ...

  const handleToggleComplete = (item) => async (event) => {
    await item.model.setProperty('complete', event.target.checked);
  };

  return (
    <div>
      <List dense>
        {/* ... Creation Input */}

        {items.map((item) => (
          <ListItem button key={item.id}>
            <ListItemIcon>
              <Checkbox
                edge='start'
                tabIndex={-1}
                checked={item.model.getProperty('complete') || false}
                onChange={handleToggleComplete(item)}
              />
            </ListItemIcon>

            <ListItemText primary={item.model.getProperty('title')} />
          </ListItem>
        ))}
      </List>

      {/* ... Share Button */}
    </div>
  );
};
```

If you go back to your app, you should now be able to check and uncheck them.

![data](images/data-04.png)

## Deleting items

To complete the famous CRUD operations, we just need to add a deletion option. Let's add a button to each task to make it happen. As are making a soft-delete of the items, we just need to update it's `deleted` property:

```jsx:title=src/components/TaskList.js
import { ObjectModel } from '@dxos/object-model';
import { useParty, useSelection } from '@dxos/react-client';

const TASK_TYPE = 'example.com/type/task';

const TaskList = ({ partyKey }) => {
  // ...

  const handleDeleteTask = (item) => async () => {
    await item.model.setProperty('deleted', true);
  };

  return (
    <div>
      <List dense>
        {/* ... Creation Input */}

        {items.map((item) => (
          <ListItem button key={item.id}>
            <ListItemIcon>
              <Checkbox
                edge='start'
                tabIndex={-1}
                checked={item.model.getProperty('complete') || false}
                onChange={handleToggleComplete(item)}
              />
            </ListItemIcon>

            <ListItemText primary={item.model.getProperty('title')} />

            <ListItemSecondaryAction>
              <IconButton size='small' edge='end' aria-label='delete' onClick={handleDeleteTask(item)}>
                <DeleteIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>

      {/* ... Share Button */}
    </div>
  );
};
```

One last time, go back to your app and you should now be able to delete your tasks.

![data](images/data-05.png)
