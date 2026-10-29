//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import * as Capability from '@dxos/app-framework/Capability';
import { withPluginManager } from '@dxos/app-framework/testing';
import { EXEMPLAR_NAMES, type ExemplarName } from '@dxos/diagram/testing';
import * as AnimatorCapabilities from '@dxos/plugin-animator/AnimatorCapabilities';
import { AnimatorArticle } from '@dxos/plugin-animator/testing';
import { translations as animatorTranslations } from '@dxos/plugin-animator/translations';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { makeExemplarAnimation } from '../../testing/scene-animations.ts';
import { scene2dStage, scene3dStage } from './definition.ts';

type StoryProps = { exemplar: ExemplarName };

const DefaultStory = ({ exemplar }: StoryProps) => {
  const animation = useMemo(() => makeExemplarAnimation(exemplar), [exemplar]);
  return <AnimatorArticle role='article' attendableId='story' subject={animation} />;
};

const meta = {
  title: 'plugins/plugin-canvas/containers/SceneStage',
  component: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      capabilities: [
        Capability.contribute(AnimatorCapabilities.Stage, scene2dStage),
        Capability.contribute(AnimatorCapabilities.Stage, scene3dStage),
      ],
    }),
    // Outermost, so the plugin manager's registry (which holds the stages) is the one components read.
    withAttention('story'),
  ],
  parameters: { layout: 'fullscreen', translations: [...translations, ...animatorTranslations] },
  argTypes: { exemplar: { control: 'select', options: EXEMPLAR_NAMES } },
  args: { exemplar: 'links' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
