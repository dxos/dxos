//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { RevealPlayer } from './Reveal';
// @ts-ignore
import CONTENT from '../../testing/slides.md?raw';

// https://revealjs.com/markdown
// https://developer.mozilla.org/en-US/docs/Web/CSS/background-position
// https://colorhunt.co/palettes/dark
// https://fontsource.org/fonts
// https://fonts.google.com
const Story = () => {
  return <RevealPlayer content={CONTENT} />;
};

export default {
  title: 'plugin-presenter/Reveal',
  render: Story,
};

export const Default = {};
