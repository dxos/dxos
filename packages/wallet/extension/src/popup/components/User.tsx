//
// Copyright 2021 DXOS.org
//

import React, { useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';

import { Card, CardHeader, Typography, makeStyles, IconButton, Menu, MenuItem, ListItemIcon, Grid } from '@material-ui/core';
import GroupIcon from '@material-ui/icons/Group';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import CopyButton from './CopyButton';

import type { Profile } from '../utils';

const useStyles = makeStyles({
  card: {
    margin: 15
  },
  ellipsis: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
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
          <Grid container alignContent="space-between" alignItems="center">
            <Grid item xs={11} md={8} lg={6}>
              <Typography variant="body2" color="textSecondary" className={classes.ellipsis}>
                {profile.publicKey}
              </Typography>
            </Grid>
            <Grid item xs={1} md={4} lg={6}>
              <CopyButton text={profile.publicKey ?? ''}/>
            </Grid>
          </Grid>
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
        anchorOrigin={{ vertical: 'center', horizontal: 'left' }}
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
