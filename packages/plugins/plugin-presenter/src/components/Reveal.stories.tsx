//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React from 'react';

// @ts-ignore
// eslint-disable-next-line import/order
import CONTENT from '../../testing/deck.md?raw';

// eslint-disable-next-line import/order
import { RevealPlayer } from './Reveal';

// https://revealjs.com/markdown
// https://developer.mozilla.org/en-US/docs/Web/CSS/background-position
// https://colorhunt.co/palettes/dark
// https://colorhunt.co/palette/ff204ea0153e5d0e4100224d
// https://colorhunt.co/palette/27374d526d829db2bfdde6ed
// https://fontsource.org/fonts
// https://fonts.google.com

const DefaultStory = () => {
  return <RevealPlayer content={CONTENT} />;
};

export const Default = {};

const meta: Meta = {
  title: 'plugins/plugin-presenter/Reveal',
  render: DefaultStory,
};

export default meta;
