//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import defaultsDeep from 'lodash.defaultsdeep';
import React from 'react';

import { log } from '@dxos/log';
import { faker } from '@dxos/random';
import { withTheme } from '@dxos/react-ui/testing';

import { blast, defaultOptions, dropFile, typewriter } from '../extensions';
import { str } from '../util';

import { EditorStory, content } from './components';

const meta = {
  title: 'ui/react-ui-editor/Experimental',
  component: EditorStory,
  decorators: [withTheme],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof EditorStory>;

export default meta;

type Story = StoryObj<typeof meta>;

//
// Typewriter
//

const typewriterItems = localStorage.getItem('dxos.org/testing/typewriter')?.split(',');

export const Typewriter: Story = {
  render: () => (
    <EditorStory
      text={str('# Typewriter', '', content.paragraphs, content.footer)}
      extensions={[typewriter({ items: typewriterItems })]}
    />
  ),
};

//
// Blast
//

export const Blast: Story = {
  render: () => (
    <EditorStory
      text={str('# Blast', '', content.paragraphs, content.codeblocks, content.paragraphs)}
      extensions={[
        typewriter({ items: typewriterItems }),
        blast(
          defaultsDeep(
            {
              effect: 2,
              particleGravity: 0.2,
              particleShrinkRate: 0.995,
              color: () => [faker.number.int({ min: 100, max: 200 }), 0, 0],
              // color: () => [faker.number.int(256), faker.number.int(256), faker.number.int(256)],
            },
            defaultOptions,
          ),
        ),
      ]}
    />
  ),
};

//
// DND
//

export const DND: Story = {
  render: () => (
    <EditorStory
      text={str('# DND', '')}
      extensions={[
        dropFile({
          onDrop: (view, event) => {
            log.info('drop', event);
          },
        }),
      ]}
    />
  ),
};
