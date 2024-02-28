//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { BookBookmark } from '@phosphor-icons/react';
import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { PlankHeadingButton, plankHeadingIconProps } from './PlankHeading';
import translations from '../../translations';
import { AttentionProvider } from '../Attention';

type StorybookPlankHeadingProps = {
  attendableId?: string;
};

const storybookAttended = new Set(['attended-story']);

const StorybookPlankHeading = ({ attendableId }: StorybookPlankHeadingProps) => {
  return (
    <AttentionProvider attended={storybookAttended}>
      <PlankHeadingButton attendableId={attendableId}>
        <BookBookmark {...plankHeadingIconProps} />
      </PlankHeadingButton>
    </AttentionProvider>
  );
};

export default {
  title: 'react-ui-deck/PlankHeading',
  component: StorybookPlankHeading,
  decorators: [withTheme],
  parameters: { translations },
};

export const Default = {
  args: {},
};

export const Attention = {
  args: { attendableId: 'attended-story' },
};
