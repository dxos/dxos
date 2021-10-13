//
// Copyright 2021 DXOS.org
//

import { Link as LinkIcon } from '@mui/icons-material';
import { IconButton } from '@mui/material';
import React from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';

import { truncateString } from '@dxos/debug';

export const TruncateCopy = ({ text } : { text: string }) => {
  return (
    <>
      {truncateString(text, 8)}
      <CopyToClipboard text={text} onCopy={value => console.log(value)}>
        <IconButton
          color='inherit'
          aria-label='copy to clipboard'
          title='Copy to clipboard'
          edge='end'
        >
          <LinkIcon />
        </IconButton>
      </CopyToClipboard>
    </>
  );
};
