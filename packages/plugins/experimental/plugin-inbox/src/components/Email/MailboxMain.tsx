//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Main } from '@dxos/react-ui';
import {
  baseSurface,
  fixedInsetFlexLayout,
  topbarBlockPaddingStart,
  bottombarBlockPaddingEnd,
} from '@dxos/react-ui-theme';

import { Mailbox, type MailboxProps } from './Mailbox';

const MailboxMain = ({ mailbox, options = {} }: MailboxProps) => (
  <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart, bottombarBlockPaddingEnd]}>
    <Mailbox mailbox={mailbox} options={options} />
  </Main.Content>
);

export default MailboxMain;
