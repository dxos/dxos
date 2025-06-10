//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import defaultsDeep from 'lodash.defaultsdeep';
import React from 'react';

import { log } from '@dxos/log';
import { faker } from '@dxos/random';
import { withLayout, withTheme, type Meta } from '@dxos/storybook-utils';

import { EditorStory, str, content } from './story-utils';
import { typewriter, blast, defaultOptions, dropFile, listener } from '../extensions';

const meta: Meta<typeof EditorStory> = {
  title: 'ui/react-ui-editor/TextEditor',
  decorators: [withTheme, withLayout({ fullscreen: true })],
  render: EditorStory,
  parameters: { layout: 'fullscreen' },
};

export default meta;

//
// Listener
//

export const Listener = {
  render: () => (
    <EditorStory
      text={str('# Listener', '', content.footer)}
      extensions={[
        listener({
          onFocus: (focusing) => {
            console.log({ focusing });
          },
          onChange: (text) => {
            console.log({ text });
          },
        }),
      ]}
    />
  ),
};

//
// Typewriter
//

const typewriterItems = localStorage.getItem('dxos.org/plugin/markdown/typewriter')?.split(',');

export const Typewriter = {
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

export const Blast = {
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

export const DND = {
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
