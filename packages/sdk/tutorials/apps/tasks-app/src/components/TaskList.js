//
// Copyright 2020 DXOS.org
//

import React, { useState, useRef, useEffect } from 'react';

import {
  Checkbox,
  Fab,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText,
  TextField
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Share as ShareIcon
} from '@material-ui/icons';

import { ObjectModel } from '@dxos/object-model';
import { useParty, useItems } from '@dxos/react-client';
import { PartySharingDialog } from '@dxos/react-ux';

const useStyles = makeStyles(theme => ({
  toolbar: {
    display: 'flex',
    flex: 1,
    flexGrow: 0,
    paddingLeft: theme.spacing(1.5),
    paddingRight: theme.spacing(1.5)
  },
  flexGrow: {
    flex: 1
  },
  container: {
    flex: 1,
    margin: theme.spacing(1),
    overflowY: 'hidden'
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden'
  },
  reverseList: {
    display: 'flex',
    flexDirection: 'column-reverse',
    overflowY: 'scroll'
  },
  fillVertically: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'hidden'
  },
  actions: {
    margin: theme.spacing(2),
    '& button': {
      marginRight: theme.spacing(1)
    }
  }
}));

const TASK_TYPE = 'example.com/type/task';

// TODO(burdon): Editable title.
// TODO(burdon): Editable list items.
// TODO(burdon): Scrolling list.

const TaskList = ({ partyKey }) => {
  const classes = useStyles();
  const [shareDialog, setShareDialog] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const scrollListRef = useRef(null);
  const party = useParty(partyKey);
  const items = useItems({ partyKey, type: TASK_TYPE });

  useEffect(() => {
    scrollListRef.current.scrollTop = -scrollListRef.current.scrollHeight;
  }, [items]);

  const handleShare = () => {
    setShareDialog(true);
  };

  const handleCreateTask = async () => {
    if (!taskTitle.length) {
      return;
    }

    await party.database.createItem({
      type: TASK_TYPE,
      model: ObjectModel,
      props: {
        title: taskTitle
      }
    });

    setTaskTitle('');
  };

  const handleDeleteTask = item => async () => {
    // TODO(burdon): ECHO system property for soft-deletes (with query param to filter).
    // ISSUE(rzadp): https://github.com/dxos/echo/issues/313
    await item.model.setProperty('deleted', true);
  };

  const handleToggleComplete = item => async (event) => {
    await item.model.setProperty('complete', event.target.checked);
  };

  if (!partyKey) {
    return null;
  }

  return (
    <div className={classes.fillVertically}>
      {shareDialog && (
        <PartySharingDialog
          open
          party={party}
          onClose={() => setShareDialog(false)}
        />
      )}

      <div className={classes.container}>
        {/* Create task. */}
        <List dense className={classes.list}>
          <ListItem>
            <ListItemIcon />
            <TextField
              fullWidth
              autoFocus
              value={taskTitle}
              onChange={event => setTaskTitle(event.target.value)}
              onKeyPress={event => (event.key === 'Enter') && handleCreateTask()}
            />
            <ListItemSecondaryAction>
              <IconButton
                size="small"
                edge="end"
                aria-label="delete"
                onClick={handleCreateTask}
              >
                <AddIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>

          {/* Current tasks. */}
          <div className={classes.reverseList} ref={scrollListRef}>
            {items
              .filter(item => !item.model.getProperty('deleted')) // TODO(burdon): useItems filter.
              .map(item => (
                <ListItem
                  button
                  key={item.id}
                >
                  <ListItemIcon>
                    <Checkbox
                      edge="start"
                      tabIndex={-1}
                      checked={item.model.getProperty('complete') || false}
                      onChange={handleToggleComplete(item)}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.model.getProperty('title')}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      size="small"
                      edge="end"
                      aria-label="delete"
                      onClick={handleDeleteTask(item)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
          </div>
        </List>
      </div>

      <div className={classes.actions}>
        <Fab
          size="small"
          color="secondary"
          aria-label="invite"
          title="Invite people"
          onClick={handleShare}
        >
          <ShareIcon />
        </Fab>
      </div>
    </div>
  );
};

export default TaskList;
