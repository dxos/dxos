//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { Grid, CardContent, Card, Button, CardActions } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles(theme => ({
  grid: {
    backgroundColor: theme.palette.grey[100],
    minHeight: '100vh'
  },

  card: {
    width: '50%'
  },

  title: {
    fontSize: '1.5em',
    color: 'red',
    marginBottom: 20
  },

  code: {
    display: 'block',
    font: 'monospace',
    whiteSpace: 'pre',
    padding: 8,
    border: '1px solid #ccc',
    backgroundColor: '#eee',
    borderRadius: 8,
    margin: 8,
    overflow: 'auto'
  },

  actions: {
    justifyContent: 'space-between',
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(2),
    marginBottom: 20
  }
}));

/**
 * View component used to handle crashed app situations.
 * Allows the user to either restart the app or reset storage.
 * Used in `ErrorBoundary`
 */
export const ErrorView = ({
  onRestart,
  onReset,
  error,
  config
}: {
  onRestart?: () => void,
  onReset?: () => void,
  error: Error | null,
  config?: Record<string, string>
}) => {
  const classes = useStyles();
  const isDev = process.env.NODE_ENV === 'development';
  const issuesLink = config?.issuesLink ?? 'https://github.com/dxos/sdk/issues/new';

  return (
    <Grid
      container
      direction="column"
      alignItems="center"
      justify="center"
      className={classes.grid}
    >
      <Card className={classes.card}>
        <CardContent>
          <p className={classes.title}>Something went wrong.</p>
          <p>Please try again, or <a target="_blank" rel="noopener noreferrer" href={issuesLink}>Report this issue</a>.</p>
          <p>Details:</p>
          <code className={classes.code}>{String(error?.stack)}</code>
          {isDev && config &&
            <>
              <p>Configuration:</p>
              <code className={classes.code}>{JSON.stringify(config.values, undefined, 2)}</code>
            </>}
        </CardContent>
        <CardActions className={classes.actions}>
          {(onReset)
            ? <Button variant="text" color="secondary" onClick={onReset}>Reset storage</Button>
            : <span />}
          <Button variant="contained" color="primary" onClick={onRestart}>Try again</Button>
        </CardActions>
      </Card>
    </Grid>
  );
};

export default ErrorView;
