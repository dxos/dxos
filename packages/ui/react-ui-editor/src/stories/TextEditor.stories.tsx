//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { javascript } from '@codemirror/lang-javascript';
import { openSearchPanel } from '@codemirror/search';
import React from 'react';

import { log } from '@dxos/log';
import { withLayout, withTheme, type Meta } from '@dxos/storybook-utils';

import {
  EditorStory,
  allExtensions,
  content,
  defaultExtensions,
  global,
  largeWithImages,
  links,
  longText,
  names,
  renderLinkButton,
  text,
} from './components';
import { editorMonospace } from '../defaults';
import {
  InputModeExtensions,
  autocomplete,
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

const meta: Meta<typeof EditorStory> = {
  title: 'ui/react-ui-editor/TextEditor',
  component: EditorStory,
  decorators: [withTheme, withLayout({ fullscreen: true })],
  parameters: { layout: 'fullscreen', controls: { disable: true } },
};

export default meta;

//
// Default
//

export const Default = {
  render: () => <EditorStory text={text} extensions={defaultExtensions} />,
};

//
// Everything
//

export const Everything = {
  render: () => <EditorStory text={text} extensions={allExtensions} selection={{ anchor: 99, head: 110 }} />,
};

//
// Empty
//

export const Empty = {
  render: () => <EditorStory extensions={defaultExtensions} />,
};

//
// Readonly
//

export const Readonly = {
  render: () => <EditorStory text={text} extensions={defaultExtensions} readOnly />,
};

//
// No Extensions
//

export const NoExtensions = {
  render: () => <EditorStory text={text} />,
};

//
// Vim
//

export const Vim = {
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

export const Listener = {
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

export const Folding = {
  render: () => <EditorStory text={text} extensions={[folding()]} />,
};

//
// Scrolling
//

export const Scrolling = {
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

export const ScrollingWithImages = {
  render: () => (
    <EditorStory text={str('# Large Document', '', largeWithImages)} extensions={[decorateMarkdown(), image()]} />
  ),
};

export const ScrollTo = {
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

export const Typescript = {
  render: () => (
    <EditorStory
      text={content.typescript}
      lineNumbers
      extensions={[editorMonospace, javascript({ typescript: true })]}
    />
  ),
};

//
// Autocomplete
//

export const Autocomplete = {
  render: () => (
    <EditorStory
      text={str('# Autocomplete', '', 'Press Ctrl-Space...', content.footer)}
      extensions={[
        decorateMarkdown({ renderLinkButton }),
        autocomplete({
          onSearch: (text) => {
            return links.filter(({ label }) => label.toLowerCase().includes(text.toLowerCase()));
          },
        }),
      ]}
    />
  ),
};

//
// Typeahead
//

const completions = ['type', 'AND', 'OR', 'NOT', 'dxos.org'];

export const Typeahead = {
  render: () => (
    <EditorStory
      text={str('# Typeahead', '')}
      extensions={[
        decorateMarkdown({ renderLinkButton }),
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

export const Mention = {
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

export const Search = {
  render: () => (
    <EditorStory
      text={str('# Search', text)}
      extensions={defaultExtensions}
      onReady={(view) => openSearchPanel(view)}
    />
  ),
};
