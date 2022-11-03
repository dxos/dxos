//
// Copyright 2021 DXOS.org
//

import React from 'react';
import { CopyToClipboard as Clipboard } from 'react-copy-to-clipboard';

import { ContentCopy as CopyIcon } from '@mui/icons-material';
import { SvgIconTypeMap } from '@mui/material';
import { OverridableComponent } from '@mui/material/OverridableComponent';

export const CopyToClipboard = ({
  text,
  onCopy,
  icon: Icon = CopyIcon
}: {
  text: string;
  onCopy?: (text: string) => void;
  icon?: OverridableComponent<SvgIconTypeMap<unknown, 'svg'>>;
}) => (
  <Clipboard text={text} onCopy={(value) => onCopy?.(value)}>
    <Icon />
  </Clipboard>
);
