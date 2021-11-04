//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { Box, Typography, TypographyProps } from '@mui/material';

import { truncateString } from '@dxos/debug';

import { CopyToClipboard } from './CopyToClipboard';

export interface CopyTextProps extends TypographyProps {
  value?: string
  length?: number
  onCopyToClipboard?: (text: string) => void
}

export const CopyText = ({ value, length, sx, onCopyToClipboard, ...rest }: CopyTextProps) => {
  // TODO(burdon): Only expand to limit of div.
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
          ...sx
        }}
        title={value}
        {...rest}
      >
        {length ? truncateString(value, length) : value}
      </Typography>
      {value && (
        <>
          <Box sx={{ flex: 1 }} />
          <Box sx={{ flexShrink: 0, width: 40, marginLeft: '2px' }}>
            <CopyToClipboard text={value} onCopy={value => console.log(value)} />
          </Box>
        </>
      )}
    </Box>
  );
};
