//
// Copyright 2021 DXOS.org
//

import React from 'react';


import IconButton from '@material-ui/core/IconButton';
import LinkIcon from '@material-ui/icons/Link';

import { CopyToClipboard } from 'react-copy-to-clipboard';

import { truncateString } from '@dxos/debug';

const TruncateCopy = ({ text } : { text: string }) => {
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
}

export default TruncateCopy;
