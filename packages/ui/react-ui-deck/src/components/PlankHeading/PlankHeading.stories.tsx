//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { BookBookmark } from '@phosphor-icons/react';
import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { PlankHeading, plankHeadingIconProps } from './PlankHeading';
import { plankHeadingLayout } from '../../fragments/layout';
import translations from '../../translations';
import { AttentionProvider } from '../Attention';

type StorybookPlankHeadingProps = {
  attendableId?: string;
  label?: string;
};

const storybookAttended = new Set(['attended-story']);

const StorybookPlankHeading = ({
  attendableId = '',
  label = 'Plank heading Storybook story',
}: StorybookPlankHeadingProps) => {
  return (
    <AttentionProvider attended={storybookAttended}>
      <div role='none' className={plankHeadingLayout}>
        <PlankHeading.Button attendableId={attendableId}>
          <BookBookmark {...plankHeadingIconProps} />
        </PlankHeading.Button>
        <PlankHeading.Label attendableId={attendableId}>{label}</PlankHeading.Label>
      </div>
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
