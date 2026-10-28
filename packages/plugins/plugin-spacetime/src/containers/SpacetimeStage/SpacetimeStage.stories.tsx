//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import * as Capability from '@dxos/app-framework/Capability';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as AnimatorCapabilities from '@dxos/plugin-animator/AnimatorCapabilities';
import { AnimatorArticle } from '@dxos/plugin-animator/testing';
import { translations as animatorTranslations } from '@dxos/plugin-animator/translations';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';
import { type Scene } from '#types';

import { makeDemoAnimation, makeEcho3dAnimation } from '../../testing/index.ts';
import { spacetimeStage } from './definition.ts';

type StoryProps = { fixture: 'demo' | 'echo3d'; style?: Scene.Style };

const DefaultStory = ({ fixture, style }: StoryProps) => {
  const animation = useMemo(
    () => (fixture === 'echo3d' ? makeEcho3dAnimation() : makeDemoAnimation(style)).animation,
    [fixture, style],
  );
  return <AnimatorArticle role='article' attendableId='story' subject={animation} />;
};

const meta = {
  title: 'plugins/plugin-spacetime/containers/SpacetimeStage',
  component: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({ capabilities: [Capability.contribute(AnimatorCapabilities.Stage, spacetimeStage)] }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations: [...translations, ...animatorTranslations],
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The CAD look over a small scene: layouts, a camera move, label styles and a label morph, then effects.
 *
 * Test:
 * 1. Press play: the hub and five objects grow in, with the caption "Layouts".
 * 2. At 1.5s the objects move onto a ring; at 3.5s they orbit the hub on a tilted circle as the camera lowers.
 * 3. At 5.5s they form a grid and the hub's label swells to a title; at 7.5s they pack inside the hub and its label
 *    sits across it.
 * 4. At 9.5s the hub's label morphs from "Hub" to "The Central Hub", the word "Hub" sliding into place.
 * 5. Scrub back and forth: every frame matches playback, and the labels follow their objects.
 * 6. In shot 2, packets flow along the links, threads pop up beside objects, and at 4s "Ed" bursts into particles.
 */
export const Default: Story = { args: { fixture: 'demo', style: 'cad' } };

/**
 * The same animation in the presentation look (F-4.5).
 *
 * Test:
 * 1. The background is night blue with a faint lattice; the hub is a see-through shell with a rim glow and a lattice.
 * 2. Large spheres shade smoothly, without banding.
 * 3. The labels and effects behave as in Default.
 */
export const Presentation: Story = { args: { fixture: 'demo', style: 'presentation' } };

/**
 * The echo3d story as an Animation (T-4): twelve slides over four scenes.
 *
 * Test:
 * 1. Shot 1: "In the Beginning" fades in over an empty frame.
 * 2. Shots 2–3: your company and the SaaS vendor grow in side by side; packets run both ways along the link, some red.
 * 3. Shots 4–7: your data spreads across seven apps; the frontier lab arrives on the right; traffic to the lab is
 *    heavier; the apps shrink away as their data slides into the lab's.
 * 4. Shot 8: two labs merge into the third, their companies join its orbit, and its name morphs from "Frontier Labs"
 *    to "The Final Frontier" as a title.
 * 5. Shot 9: the lab swells to fill the frame, companies burst, the curtain falls and lifts, and "Welcome to the
 *    Singularity" comes up.
 * 6. Shot 10: the camera closes on ECHO, the spaces grow in with the side title "ECHO Hypergraph", and threads pop up.
 * 7. Shot 11: into the Platform space; one object grows and its card and thread appear in the margin.
 * 8. Shot 12: your company and ECHO grow until ECHO fills the frame in blue; the DXOS headline and three lines follow.
 */
export const Echo3d: Story = { args: { fixture: 'echo3d' } };
