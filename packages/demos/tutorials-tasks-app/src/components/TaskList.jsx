//
// Copyright 2020 DXOS.org
//

import React, { useState, useRef, useEffect } from 'react';

import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import {
  Checkbox,
  createTheme,
  Fab,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText,
  TextField
} from '@mui/material';
import { makeStyles } from '@mui/styles';

import { proto } from '@dxos/client';
import { ObjectModel } from '@dxos/object-model';
import { useParty, useSelection } from '@dxos/react-client';
import { PartySharingDialog } from '@dxos/react-toolkit';

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
}), { defaultTheme: createTheme({}) });

const TASK_TYPE = 'example.com/type/task';

// TODO(burdon): Editable title.
// TODO(burdon): Editable list items.
// TODO(burdon): Scrolling list.

export const TaskList = ({ partyKey, hideShare = false }) => {
  const classes = useStyles();
  const [taskTitle, setTaskTitle] = useState('');
  const scrollListRef = useRef(null);
  const party = useParty(partyKey);
  const items = useSelection(party?.select({ type: TASK_TYPE }));

  const [partyInvitationDialog, setPartyInvitationDialog] = useState(false);

  useEffect(() => {
    scrollListRef.current.scrollTop = -scrollListRef.current.scrollHeight;
  }, [items]);

  const handleCreateTask = async () => {
    if (!taskTitle.length) {
      return;
    }

    await party?.database.createItem({
      type: TASK_TYPE,
      model: ObjectModel,
      props: {
        title: taskTitle
      }
    });

    setTaskTitle('');
  };

  const handleDeleteTask = item => async () => {
    await item.delete();
  };

  const handleToggleComplete = item => async (event) => {
    await item.model.set('complete', event.target.checked);
  };

  const handleDownload = async () => {
    if (!party) {
      return;
    }

    const snapshot = await party.createSnapshot();
    const blob = new Blob([proto.schema.getCodecForType('dxos.echo.snapshot.PartySnapshot').encode(snapshot)]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${party.key.toHex()}.party`;
    a.click();
  };

  if (!partyKey) {
    return null;
  }

  return (
    <div className={classes.fillVertically}>
      <div className={classes.container}>
        {/* Create task. */}
        <List dense className={classes.list}>
          <ListItem>
            <ListItemIcon />
            <TextField
              fullWidth
              autoFocus
              value={taskTitle}
              variant='standard'
              onChange={event => setTaskTitle(event.target.value)}
              onKeyPress={event => (event.key === 'Enter') && handleCreateTask()}
            />
            <ListItemSecondaryAction>
              <IconButton
                size='small'
                edge='end'
                aria-label='create'
                onClick={handleCreateTask}
              >
                <AddIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>

          {/* Current tasks. */}
          <div className={classes.reverseList} ref={scrollListRef}>
            {items?.map(item => (
              <ListItem
                button
                key={item.id}
              >
                <ListItemIcon>
                  <Checkbox
                    edge='start'
                    tabIndex={-1}
                    checked={item.model.get('complete') || false}
                    onChange={handleToggleComplete(item)}
                  />
                </ListItemIcon>
                <ListItemText
                  primary={item.model.get('name')}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    size='small'
                    edge='end'
                    aria-label='delete'
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

      <PartySharingDialog
        open={partyInvitationDialog}
        onClose={() => setPartyInvitationDialog(false)}
        partyKey={partyKey}
      />

      {!hideShare && (
        <div className={classes.actions}>
          <Fab
            size='small'
            color='secondary'
            aria-label='invite'
            title='Invite people'
            onClick={() => setPartyInvitationDialog(true)}
          >
            <ShareIcon />
          </Fab>
          <Fab
            size='small'
            color='secondary'
            aria-label='download'
            title='Download party'
            onClick={handleDownload}
          >
            <DownloadIcon />
          </Fab>
        </div>
      )}
    </div>
  );
};
