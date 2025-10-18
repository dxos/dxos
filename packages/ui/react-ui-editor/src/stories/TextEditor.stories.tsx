//
// Copyright 2023 DXOS.org
//

import { javascript } from '@codemirror/lang-javascript';
import { openSearchPanel } from '@codemirror/search';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { log } from '@dxos/log';
import { withTheme } from '@dxos/react-ui/testing';

import { editorMonospace } from '../defaults';
import {
  InputModeExtensions,
  decorateMarkdown,
  folding,
  image,
  listener,
  mention,
  selectionState,
  staticCompletion,
  typeahead,
} from '../extensions';
import { str } from '../testing';

import {
  EditorStory,
  allExtensions,
  content,
  defaultExtensions,
  global,
  largeWithImages,
  longText,
  names,
  text,
} from './components';

const meta = {
  title: 'ui/react-ui-editor/TextEditor',
  component: EditorStory,
  decorators: [withTheme],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
  },
} satisfies Meta<typeof EditorStory>;

export default meta;

//
// Default
//

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <EditorStory text={text} extensions={defaultExtensions} />,
};

//
// Everything
//

export const Everything: Story = {
  render: () => <EditorStory text={text} extensions={allExtensions} selection={{ anchor: 99, head: 110 }} />,
};

//
// Empty
//

export const Empty: Story = {
  render: () => <EditorStory extensions={defaultExtensions} />,
};

//
// Readonly
//

export const Readonly: Story = {
  render: () => <EditorStory text={text} extensions={defaultExtensions} readOnly />,
};

//
// No Extensions
//

export const NoExtensions: Story = {
  render: () => <EditorStory text={text} />,
};

//
// Vim
//

export const Vim: Story = {
  render: () => (
    <EditorStory
      text={str('# Vim Mode', '', 'The distant future. The year 2000.', '', content.paragraphs)}
      extensions={[defaultExtensions, InputModeExtensions.vim]}
    />
  ),
};

//
// Listener
//

export const Listener: Story = {
  render: () => (
    <EditorStory
      text={str('# Listener', '', content.footer)}
      extensions={[
        listener({
          onFocus: (focusing) => {
            log.info('listener', { focusing });
          },
          onChange: (text) => {
            log.info('listener', { text });
          },
        }),
      ]}
    />
  ),
};

//
// Folding
//

export const Folding: Story = {
  render: () => <EditorStory text={text} extensions={[folding()]} />,
};

//
// Scrolling
//

export const Scrolling: Story = {
  render: () => (
    <EditorStory
      text={str('# Large Document', '', longText)}
      extensions={selectionState({
        setState: (id, state) => global.set(id, state),
        getState: (id) => global.get(id),
      })}
    />
  ),
};

export const ScrollingWithImages: Story = {
  render: () => (
    <EditorStory text={str('# Large Document', '', largeWithImages)} extensions={[decorateMarkdown(), image()]} />
  ),
};

export const ScrollTo: Story = {
  render: () => {
    // NOTE: Selection won't appear if text is reformatted.
    const word = 'Scroll to here...';
    const text = str('# Scroll To', longText, '', word, '', longText);
    const idx = text.indexOf(word);
    return (
      <EditorStory
        text={text}
        extensions={defaultExtensions}
        scrollTo={idx}
        selection={{ anchor: idx, head: idx + word.length }}
      />
    );
  },
};

//
// Typescript
//

export const Typescript: Story = {
  render: () => (
    <EditorStory
      text={content.typescript}
      lineNumbers
      extensions={[editorMonospace, javascript({ typescript: true })]}
    />
  ),
};

//
// Typeahead
//

const completions = ['hello world!', 'dxos.org'];

export const Typeahead: Story = {
  render: () => (
    <EditorStory
      text={str('# Typeahead', '')}
      extensions={[
        typeahead({
          onComplete: staticCompletion(completions, { minLength: 2 }),
        }),
      ]}
    />
  ),
};

//
// Mention
//

export const Mention: Story = {
  render: () => (
    <EditorStory
      text={str('# Mention', '', 'Type @...', content.footer)}
      extensions={[
        mention({
          onSearch: (text) => names.filter((name) => name.toLowerCase().startsWith(text.toLowerCase())),
        }),
      ]}
    />
  ),
};

//
// Search
//

export const Search: Story = {
  render: () => (
    <EditorStory
      text={str('# Search', text)}
      extensions={defaultExtensions}
      onReady={(view) => openSearchPanel(view)}
    />
  ),
};
