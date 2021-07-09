//
// Copyright 2021 DXOS.org
//

import React, { useRef, useState } from 'react';

import { Card, CardHeader, Typography, makeStyles, IconButton, Menu, MenuItem, ListItemIcon } from '@material-ui/core';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import GroupIcon from '@material-ui/icons/Group';
import type { Profile } from '../utils';
import { useHistory } from 'react-router-dom';

const useStyles = makeStyles({
  card: {
    margin: 15
  }
});

interface UserProps {
  profile : Profile
}

const User = ({ profile } : UserProps) => {
  const classes = useStyles();

  const [menuOpen, setMenuOpen] = useState(false);

  const actions = useRef<HTMLButtonElement>(null);

  const history = useHistory();

  const onPartiesClick = () => {
    history.push('/parties');
  };

  return (
    <Card className={classes.card} raised={true}>
      <CardHeader
        title={
          <Typography gutterBottom variant="h5" component="h2">
            {profile.username}
          </Typography>
        }
        subheader={
          <Typography variant="body2" color="textSecondary">
            {profile.publicKey}
          </Typography>
        }
        action={
          <IconButton aria-label="settings" ref={actions} onClick={() => setMenuOpen(m => !m)}>
            <MoreVertIcon />
          </IconButton>
        }/>
        <Menu
          open={menuOpen}
          anchorEl={actions.current} // https://github.com/mui-org/material-ui/issues/7961
          getContentAnchorEl={null}
          anchorOrigin={{ vertical: 'center', horizontal: 'left'}}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          onClose={() => setMenuOpen(false)}>
          <MenuItem button={true} onClick={onPartiesClick}>
            <ListItemIcon>
              <GroupIcon fontSize='small' />
            </ListItemIcon>
            <Typography variant="inherit"> Parties </Typography>
          </MenuItem>
        </Menu>
    </Card>
  );
};

export default User;
