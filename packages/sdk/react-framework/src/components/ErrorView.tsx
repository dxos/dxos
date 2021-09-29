//
// Copyright 2020 DXOS.org
//

import { Button, Card, CardActions, CardContent, Grid, styled } from '@mui/material';
import React from 'react';

const StyledGrid = styled(Grid)(({ theme }) => ({
  backgroundColor: theme.palette.grey[100],
  minHeight: '100vh'
}));

const StyledCard = styled(Card)({ width: '50%' });

const Title = styled('p')({
  fontSize: '1.5em',
  color: 'red',
  marginBottom: 20
});

const Code = styled('code')({
  display: 'block',
  font: 'monospace',
  whiteSpace: 'pre',
  padding: 8,
  border: '1px solid #ccc',
  backgroundColor: '#eee',
  borderRadius: 8,
  margin: 8,
  overflow: 'auto'
});

const Actions = styled(CardActions)(({ theme }) => ({
  justifyContent: 'space-between',
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(2),
  marginBottom: 20
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
  const isDev = process.env.NODE_ENV === 'development';
  const issuesLink = config?.issuesLink ?? 'https://github.com/dxos/sdk/issues/new';

  return (
    <StyledGrid
      container
      direction='column'
      alignItems='center'
      justifyContent='center'
    >
      <StyledCard>
        <CardContent>
          <Title>Something went wrong.</Title>
          <p>Please try again, or <a target='_blank' rel='noopener noreferrer' href={issuesLink}>Report this issue</a>.</p>
          <p>Details:</p>
          <Code>{String(error?.stack)}</Code>
          {isDev && config &&
            <>
              <p>Configuration:</p>
              <Code>{JSON.stringify(config.values, undefined, 2)}</Code>
            </>}
        </CardContent>
        <Actions>
          {(onReset)
            ? <Button variant='text' color='secondary' onClick={onReset}>Reset storage</Button>
            : <span />}
          <Button variant='contained' color='primary' onClick={onRestart}>Try again</Button>
        </Actions>
      </StyledCard>
    </StyledGrid>
  );
};

export default ErrorView;
