//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { Box, IconButton, Typography, TypographyProps } from '@mui/material';

import { truncateString } from '@dxos/debug';

import { CopyToClipboard } from './CopyToClipboard';

export interface CopyTextProps extends TypographyProps {
  value?: string
  length?: number
  monospace?: boolean
  onCopyToClipboard?: (text: string) => void
}

export const CopyText = ({ value, length, monospace, onCopyToClipboard, sx, variant, ...rest }: CopyTextProps) => {
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
        {length ? truncateString(value, length) : value}
      </Typography>

      {value && (
        <>
          <Box sx={{ flex: 1 }} />
          <Box sx={{ flexShrink: 0, width: 40, marginLeft: '2px' }}>
            <IconButton>
              <CopyToClipboard text={value} />
            </IconButton>
          </Box>
        </>
      )}
    </Box>
  );
};
