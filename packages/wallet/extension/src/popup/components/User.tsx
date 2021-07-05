//
// Copyright 2021 DXOS.org
//

//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { Card, CardContent, Typography, makeStyles } from '@material-ui/core';

const useStyles = makeStyles({
  card: {
    margin: 15
  }
});

interface UserProps {
  profile : {
    username?: string,
    publicKey?: string
  }
}

const User = ({ profile } : UserProps) => {
  const classes = useStyles();

  return (
    <Card className={classes.card} raised={true}>
      <CardContent>
        <Typography gutterBottom variant="h5" component="h2">
          {profile.username}
        </Typography>
        <Typography variant="body2" color="textSecondary" component="p">
          {profile.publicKey}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default User;
