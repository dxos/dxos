//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { Icon } from '@dxos/react-ui';
import { AttentionProvider } from '@dxos/react-ui-attention';
import { withTheme } from '@dxos/storybook-utils';

import { PlankHeading } from './PlankHeading';
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
          <Icon icon='ph--chat--regular' size={5} />
        </PlankHeading.Button>
        <PlankHeading.Label attendableId={attendableId}>{label}</PlankHeading.Label>
      </PlankHeading.Root>
      <PlankHeading.Root>
        <PlankHeading.Button attendableId={attendableId}>
          <Icon icon='ph--stack-simple--regular' size={5} />
        </PlankHeading.Button>
        <PlankHeading.Label attendableId={attendableId}>{label}</PlankHeading.Label>
      </PlankHeading.Root>
      <PlankHeading.Root>
        <PlankHeading.Button attendableId={attendableId}>
          <Icon icon='ph--text-aa--regular' size={5} />
        </PlankHeading.Button>
        <PlankHeading.Label attendableId={attendableId}>{label}</PlankHeading.Label>
      </PlankHeading.Root>
      <PlankHeading.Root>
        <PlankHeading.Button attendableId={attendableId}>
          <Icon icon='ph--image-square--regular' size={5} />
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
