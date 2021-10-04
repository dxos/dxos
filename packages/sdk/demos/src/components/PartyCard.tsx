//
// Copyright 2020 DXOS.org
//

import { Button, Card, CardActions, CardContent, CardHeader, createTheme, Typography } from '@mui/material';
import { makeStyles } from '@mui/styles';
import * as faker from 'faker';
import React from 'react';

import { Party } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';
import { useSelection } from '@dxos/react-client';

const useStyles = makeStyles(theme => ({
  root: {
    width: 300,
    backgroundColor: theme.palette.grey[100]
  },
  ellipsis: {
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  key: {
    fontFamily: 'monospace',
    fontSize: 'small'
  }
}), { defaultTheme: createTheme({}) });

const PartyCard = ({ party }: { party: Party }) => {
  const classes = useStyles();
  const items = useSelection(
    party.database.select(s => s.filter(item => item.model.getProperty('partyKey') === party.key).items)
    , [party.key]);

  const handleCreateItem = async () => {
    const item = await party.database.createItem({ model: ObjectModel });
    await item.model.setProperty('title', faker.name.findName());
  };

  // TODO(burdon): Filter out first item (party meta).
  return (
    <Card className={classes.root}>
      <CardHeader
        classes={{ content: classes.ellipsis, subheader: classes.ellipsis }}
        title={party.title}
        subheader={party.key.toString()}
      />
      <CardContent>
        {(items ?? []).map((item: any) => (
          <Typography key={item.id}>
            {item.model.getProperty('title')}
          </Typography>
        ))}
      </CardContent>
      <CardActions>
        <Button onClick={handleCreateItem}>Create item</Button>
      </CardActions>
    </Card>
  );
};

export default PartyCard;
