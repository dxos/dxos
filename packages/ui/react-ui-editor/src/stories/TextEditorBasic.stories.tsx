//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { javascript } from '@codemirror/lang-javascript';
import { markdown } from '@codemirror/lang-markdown';
import { openSearchPanel } from '@codemirror/search';
import React from 'react';

import { withLayout, withTheme, type Meta } from '@dxos/storybook-utils';

import {
  DefaultStory,
  defaultExtensions,
  allExtensions,
  text,
  str,
  content,
  longText,
  largeWithImages,
  headings,
  global,
  renderLinkButton,
  renderLinkTooltip,
  links,
  names,
} from './story-utils';
import { editorMonospace } from '../defaults';
import {
  InputModeExtensions,
  selectionState,
  decorateMarkdown,
  folding,
  image,
  linkTooltip,
  table,
  autocomplete,
  mention,
  outliner,
} from '../extensions';

const meta: Meta<typeof DefaultStory> = {
  title: 'ui/react-ui-editor/TextEditor',
  decorators: [withTheme, withLayout({ fullscreen: true })],
  render: DefaultStory,
  parameters: { layout: 'fullscreen' },
};

export default meta;

//
// Default
//

export const Default = {
  render: () => <DefaultStory text={text} extensions={defaultExtensions} />,
};

//
// Everything
//

export const Everything = {
  render: () => <DefaultStory text={text} extensions={allExtensions} selection={{ anchor: 99, head: 110 }} />,
};

//
// Empty
//

export const Empty = {
  render: () => <DefaultStory extensions={defaultExtensions} />,
};

//
// Readonly
//

export const Readonly = {
  render: () => <DefaultStory text={text} extensions={defaultExtensions} readOnly />,
};

//
// No Extensions
//

export const NoExtensions = {
  render: () => <DefaultStory text={text} />,
};

//
// Vim
//

export const Vim = {
  render: () => (
    <DefaultStory
      text={str('# Vim Mode', '', 'The distant future. The year 2000.', '', content.paragraphs)}
      extensions={[defaultExtensions, InputModeExtensions.vim]}
    />
  ),
};

//
// Scrolling
//

export const Folding = {
  render: () => <DefaultStory text={text} extensions={[folding()]} />,
};

export const Scrolling = {
  render: () => (
    <DefaultStory
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
    <DefaultStory text={str('# Large Document', '', largeWithImages)} extensions={[decorateMarkdown(), image()]} />
  ),
};

export const ScrollTo = {
  render: () => {
    // NOTE: Selection won't appear if text is reformatted.
    const word = 'Scroll to here...';
    const text = str('# Scroll To', longText, '', word, '', longText);
    const idx = text.indexOf(word);
    return (
      <DefaultStory
        text={text}
        extensions={defaultExtensions}
        scrollTo={idx}
        selection={{ anchor: idx, head: idx + word.length }}
      />
    );
  },
};

//
// Markdown
//

export const Blockquote = {
  render: () => (
    <DefaultStory
      text={str('> Blockquote', 'continuation', content.footer)}
      extensions={decorateMarkdown()}
      debug='raw'
    />
  ),
};

export const Headings = {
  render: () => (
    <DefaultStory text={headings} extensions={decorateMarkdown({ numberedHeadings: { from: 2, to: 4 } })} />
  ),
};

export const Links = {
  render: () => (
    <DefaultStory text={str(content.links, content.footer)} extensions={[linkTooltip(renderLinkTooltip)]} />
  ),
};

export const Image = {
  render: () => <DefaultStory text={str(content.image, content.footer)} extensions={[image()]} />,
};

export const Code = {
  render: () => <DefaultStory text={str(content.codeblocks, content.footer)} extensions={[decorateMarkdown()]} />,
};

export const Lists = {
  render: () => (
    <DefaultStory
      text={str(content.tasks, '', content.bullets, '', content.numbered, content.footer)}
      extensions={[decorateMarkdown()]}
    />
  ),
};

//
// Bullet List
//

export const BulletList = {
  render: () => <DefaultStory text={str(content.bullets, content.footer)} extensions={[decorateMarkdown()]} />,
};

//
// Ordered List
//

export const OrderedList = {
  render: () => <DefaultStory text={str(content.numbered, content.footer)} extensions={[decorateMarkdown()]} />,
};

//
// Task List
//

export const TaskList = {
  render: () => (
    <DefaultStory text={str(content.tasks, content.footer)} extensions={[decorateMarkdown()]} debug='raw+tree' />
  ),
};

//
// Outliner
//

export const Outliner = {
  render: () => (
    <DefaultStory
      // text={str(...content.tasks.split('\n').filter((line) => line.trim().startsWith('-')))}
      text={str(
        //
        '- [ ] A',
        '- [ ] B',
        // Continuation lines.
        '  ## Example',
        '  Continuation line belonging to B.',
        '  ```ts',
        '  const x = 100',
        '  ```',
        '  - [ ] C',
        '    - D Items can have links [like this](https://example.com).',
      )}
      extensions={[decorateMarkdown({ listPaddingLeft: 8 }), outliner()]}
      debug='raw+tree'
    />
  ),
};

//
// Table
//

export const Table = {
  render: () => <DefaultStory text={str(content.table, content.footer)} extensions={[decorateMarkdown(), table()]} />,
};

//
// Commented out
//

export const CommentedOut = {
  render: () => (
    <DefaultStory
      text={str('# Commented out', '', content.comment, content.footer)}
      extensions={[
        decorateMarkdown(),
        markdown(),
        // commentBlock()
      ]}
    />
  ),
};

//
// Typescript
//

export const Typescript = {
  render: () => (
    <DefaultStory
      text={content.typescript}
      lineNumbers
      extensions={[editorMonospace, javascript({ typescript: true })]}
    />
  ),
};

//
// Custom
//

export const Autocomplete = {
  render: () => (
    <DefaultStory
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
// Mention
//

export const Mention = {
  render: () => (
    <DefaultStory
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
    <DefaultStory
      text={str('# Search', text)}
      extensions={defaultExtensions}
      onReady={(view) => openSearchPanel(view)}
    />
  ),
};
