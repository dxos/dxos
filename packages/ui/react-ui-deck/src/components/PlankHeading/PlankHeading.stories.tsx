//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { Chat, ImageSquare, StackSimple, TextAa } from '@phosphor-icons/react';
import React from 'react';

import { AttentionProvider } from '@dxos/react-ui-attention';
import { withTheme } from '@dxos/storybook-utils';

import { PlankHeading, plankHeadingIconProps } from './PlankHeading';
import translations from '../../translations';

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
      <PlankHeading.Root>
        <PlankHeading.Button attendableId={attendableId}>
          <Chat {...plankHeadingIconProps} />
        </PlankHeading.Button>
        <PlankHeading.Label attendableId={attendableId}>{label}</PlankHeading.Label>
      </PlankHeading.Root>
      <PlankHeading.Root>
        <PlankHeading.Button attendableId={attendableId}>
          <StackSimple {...plankHeadingIconProps} />
        </PlankHeading.Button>
        <PlankHeading.Label attendableId={attendableId}>{label}</PlankHeading.Label>
      </PlankHeading.Root>
      <PlankHeading.Root>
        <PlankHeading.Button attendableId={attendableId}>
          <TextAa {...plankHeadingIconProps} />
        </PlankHeading.Button>
        <PlankHeading.Label attendableId={attendableId}>{label}</PlankHeading.Label>
      </PlankHeading.Root>
      <PlankHeading.Root>
        <PlankHeading.Button attendableId={attendableId}>
          <ImageSquare {...plankHeadingIconProps} />
        </PlankHeading.Button>
        <PlankHeading.Label attendableId={attendableId}>{label}</PlankHeading.Label>
      </PlankHeading.Root>
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
