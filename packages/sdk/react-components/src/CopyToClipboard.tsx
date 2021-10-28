//
// Copyright 2021 DXOS.org
//

import { ContentCopy as CopyIcon } from '@mui/icons-material';
import { IconButton, SvgIconTypeMap } from '@mui/material';
import { OverridableComponent } from '@mui/material/OverridableComponent';
import React from 'react';
import { CopyToClipboard as Clipboard } from 'react-copy-to-clipboard';

export const CopyToClipboard = ({
  text,
  onCopy,
  icon: Icon = CopyIcon
} : {
  text: string,
  onCopy?: (text: string) => void,
  icon?: OverridableComponent<SvgIconTypeMap<unknown, 'svg'>>
}) => {
  return (
    <Clipboard
      text={text}
      onCopy={value => onCopy?.(value)}
    >
      <IconButton
        color='inherit'
        aria-label='copy to clipboard'
        title='Copy to clipboard'
        edge='end'
      >
        <Icon />
      </IconButton>
    </Clipboard>
  );
};
