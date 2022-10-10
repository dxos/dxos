//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { Box, IconButton, Typography, TypographyProps } from '@mui/material';

import { truncateKey } from '@dxos/debug';

import { CopyToClipboard } from './CopyToClipboard.js';

export interface CopyTextProps extends TypographyProps {
  value?: string
  length?: number
  monospace?: boolean
  onCopyToClipboard?: (text: string) => void // TODO(burdon): onCopy.
}

export const CopyText = ({ value, length, monospace, onCopyToClipboard, sx, variant, ...rest }: CopyTextProps) => {
  if (!value) {
    return null;
  }

  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      overflow: 'hidden',
      height: 40
    }}>
      <Typography
        sx={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontFamily: monospace ? 'monospace' : '',
          ...sx
        }}
        variant={variant}
        title={value}
        {...rest}
      >
        {length ? truncateKey(value, length) : value}
      </Typography>

      <Box sx={{ flex: 1 }} />
      <IconButton sx={{ marginLeft: 1 }}>
        <CopyToClipboard text={value} />
      </IconButton>
    </Box>
  );
};
