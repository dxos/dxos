//
// Copyright 2020 DXOS.org
//

import React from 'react';

import {
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
  padding: 8,
  maxHeight: 156,
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
  const stack = String(error?.stack);

  // TODO(burdon): Production button to post error.

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
            <Code>
              {stack}
            </Code>
            <Box sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginTop: '-40px',
              marginRight: '6px',
              paddingBottom: '32px'
            }}>
              <IconButton size='small'>
                <CopyToClipboard text={stack} />
              </IconButton>
            </Box>
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
        <div style={{ display: 'flex', flex: 1 }} />
        {isDev && (
          <Button
            variant='text'
            onClick={() => {}}
          >
            <Link href={issueLink} underline='none' target='_blank'>
              Create Issue
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
