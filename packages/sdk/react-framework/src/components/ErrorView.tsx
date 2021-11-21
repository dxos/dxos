//
// Copyright 2020 DXOS.org
//

import React from 'react';

import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
  Typography,
  styled
} from '@mui/material';

import { CopyToClipboard } from '@dxos/react-components';

const DEFAULT_TITLE = 'Runtime Error';
const DEFAULT_ISSUE_LINK = 'https://github.com/dxos/sdk/issues/new';

const Code = styled('div')(({ theme }) => ({
  marginTop: 16,
  padding: 16,
  maxHeight: 220,
  overflow: 'scroll',
  whiteSpace: 'break-spaces',
  backgroundColor: theme.palette.action.hover
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
  title = DEFAULT_TITLE,
  issueLink = DEFAULT_ISSUE_LINK,
  context
}: {
  onRestart?: () => void,
  onReset?: () => void,
  error: Error | null,
  title?: string,
  issueLink?: string,
  context?: any
}) => {
  const isDev = process.env.NODE_ENV === 'development';
  if (!error) {
    return null;
  }

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors
  const message = String(error); // Error.name + Error.message
  let stack = String(error?.stack);
  if (stack.indexOf(message) === 0) {
    stack = stack.substr(message.length).trim();
  }

  // Remove indents.
  stack = stack.split('\n').map(text => text.trim()).join('\n');

  return (
    <Dialog open fullWidth maxWidth='sm'>
      <DialogTitle>
        {title}
      </DialogTitle>
      <DialogContent>
        {!isDev && (
          <Typography>Something went wrong that requires the app to be reloaded.</Typography>
        )}
        {isDev && (
          <>
            <Alert severity='error'>
              {message}
            </Alert>
            {stack && (
              <Code>
                {stack}
              </Code>
            )}
          </>
        )}
        {(isDev && context) && (
          <>
            <Code>
              {JSON.stringify({ context }, undefined, 2)}
            </Code>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <IconButton size='small'>
          <CopyToClipboard text={JSON.stringify({ message, stack })} />
        </IconButton>

        <div style={{ display: 'flex', flex: 1 }} />

        {isDev && (
          <Button
            variant='text'
            onClick={() => {}}
          >
            <Link href={issueLink} underline='none' target='_blank'>
              Github Issue
            </Link>
          </Button>
        )}
        {(isDev && onReset) && (
          <Button
            variant='text'
            onClick={onReset}
          >
            Reset storage
          </Button>
        )}
        {onRestart && (
          <Button
            variant='contained'
            color='primary'
            onClick={onRestart}
          >
            Restart
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
