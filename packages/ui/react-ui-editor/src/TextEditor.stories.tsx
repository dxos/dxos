//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { markdown } from '@codemirror/lang-markdown';
import { ArrowSquareOut, X } from '@phosphor-icons/react';
import { effect, useSignal } from '@preact/signals-react';
import defaultsDeep from 'lodash.defaultsdeep';
import React, { type FC, type KeyboardEvent, StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { create, Expando } from '@dxos/echo-schema';
import { keySymbols, parseShortcut } from '@dxos/keyboard';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { faker } from '@dxos/random';
import { createDocAccessor, createEchoObject } from '@dxos/react-client/echo';
import { Button, DensityProvider, Input, ThemeProvider, useThemeContext } from '@dxos/react-ui';
import { baseSurface, defaultTx, mx, getSize } from '@dxos/react-ui-theme';
import { withFullscreen, withTheme } from '@dxos/storybook-utils';

import {
  InputModeExtensions,
  annotations,
  autocomplete,
  blast,
  command,
  comments,
  createBasicExtensions,
  createDataExtensions,
  createExternalCommentSync,
  createMarkdownExtensions,
  decorateMarkdown,
  defaultOptions,
  dropFile,
  formattingKeymap,
  image,
  linkTooltip,
  listener,
  mention,
  state,
  table,
  typewriter,
  type CommandAction,
  type CommandOptions,
  type Comment,
  type CommentsOptions,
  type SelectionState,
  folding,
  createThemeExtensions,
} from './extensions';
import { useTextEditor, type UseTextEditorProps } from './hooks';
import { editorContent } from './styles';
import translations from './translations';

faker.seed(101);

const str = (...lines: string[]) => lines.join('\n');

const num = () => faker.number.int({ min: 0, max: 9999 }).toLocaleString();

const img = '![dxos](https://pbs.twimg.com/profile_banners/1268328127673044992/1684766689/1500x500)';

const content = {
  tasks: str(
    //
    '### Task List',
    '',
    `- [x] ${faker.lorem.sentences()}`,
    `- [ ] ${faker.lorem.sentences()}`,
    `  - [ ] ${faker.lorem.sentences()}`,
    `    - [ ] ${faker.lorem.sentences()}`,
    `    - [x] ${faker.lorem.sentences()}`,
    '',
  ),

  bullets: str(
    //
    '### BulletList',
    '',
    `- ${faker.lorem.sentences()}`,
    `- ${faker.lorem.sentences()}`,
    `  - ${faker.lorem.sentences()}`,
    `  - ${faker.lorem.sentences()}`,
    `- ${faker.lorem.sentences()}`,
    '',
  ),

  numbered: str(
    //
    '### OrderedList (part 1)',
    '',
    `1. ${faker.lorem.sentences()}`,
    `1. ${faker.lorem.sentences()}`,
    `1. ${faker.lorem.sentences()}`,
    `    1. ${faker.lorem.sentences()}`,
    `    1. ${faker.lorem.sentences()}`,
    `        1. ${faker.lorem.sentences()}`,
    `1. ${faker.lorem.sentences()}`,
    '',
    '### OrderedList (part 2)',
    '',
    `1. ${faker.lorem.sentences()}`,
    '',
  ),

  code: str(
    '### Code',
    '',
    '```',
    '$ ls -las',
    '```',
    '',
    '```tsx',
    'const Component = () => {',
    '  const x = 100;',
    '',
    '  return () => <div>Test</div>;',
    '};',
    '```',
    '',
  ),

  comment: str('<!--', 'A comment', '-->', '', 'No comment.', 'Partial comment. <!-- comment. -->'),

  links: str(
    '### Links',
    '',
    'This is a naked link https://dxos.org within a sentence.',
    '',
    'Take a look at [DXOS](https://dxos.org) and how to [get started](https://docs.dxos.org/guide/getting-started.html).',
    '',
    'This is all about https://dxos.org and related technologies.',
    '',
  ),

  table: str(
    '### Tables',
    '',
    `| ${faker.lorem.word().padStart(12)} | ${faker.lorem.word().padStart(12)} | ${faker.lorem.word().padStart(12)} |`,
    `|-${''.padStart(12, '-')}-|-${''.padStart(12, '-')}-|-${''.padStart(12, '-')}-|`,
    `| ${num().padStart(12)} | ${num().padStart(12)} | ${num().padStart(12)} |`,
    `| ${num().padStart(12)} | ${num().padStart(12)} | ${num().padStart(12)} |`,
    `| ${num().padStart(12)} | ${num().padStart(12)} | ${num().padStart(12)} |`,
    '',
  ),

  image: str('### Image', '', img),

  headings: str(
    ...[1, 2, 3, 4, 5, 6].map((level) => ['#'.repeat(level) + ` Heading ${level}`, faker.lorem.sentences(), '']).flat(),
  ),

  formatting: str('### Formatting', 'This this is **bold**, ~~strikethrough~~, _italic_, and `f(INLINE)`.'),

  blockquotes: str(
    '### Blockquotes',
    '> This is a block quote.',
    '',
    '> This is a long wrapping block quote. Neque reiciendis ullam quae error labore sit, at, et, nulla, aut at nostrum omnis quas nostrum, at consectetur vitae eos asperiores non omnis ullam in beatae at vitae deserunt asperiores sapiente.',
    '',
    '> This is',
    '> a multi-line',
    '> block quote.',
  ),

  paragraphs: str(...faker.helpers.multiple(() => [faker.lorem.paragraph(), ''], { count: 3 }).flat()),

  footer: str('', '', '', '', ''),
};

const text = str(
  '# Markdown',
  'Composer Markdown Editor',
  '',

  '---',
  '## Basics',
  content.blockquotes,
  content.formatting,
  content.links,

  '---',
  '## Lists',
  content.bullets,
  content.tasks,
  content.numbered,

  '---',
  content.headings,

  '---',
  '## Misc',
  content.code,
  content.table,
  content.image,
  content.footer,
);

const links = [
  { label: 'DXOS', apply: '[DXOS](https://dxos.org)' },
  { label: 'GitHub', apply: '[DXOS GitHub](https://github.com/dxos)' },
  { label: 'Automerge', apply: '[Automerge](https://automerge.org/)' },
  { label: 'IPFS', apply: '[Protocol Labs](https://docs.ipfs.tech)' },
  { label: 'StackEdit', apply: '[StackEdit](https://stackedit.io/app)' },
];

const names = ['adam', 'alice', 'alison', 'bob', 'carol', 'charlie', 'sayuri', 'shoko'];

const hover =
  'rounded-sm text-base text-primary-600 hover:text-primary-500 dark:text-primary-300 hover:dark:text-primary-200';

const renderLinkTooltip = (el: Element, url: string) => {
  const web = new URL(url);
  createRoot(el).render(
    <StrictMode>
      <a href={url} target='_blank' rel='noreferrer' className={hover}>
        {web.origin}
        <ArrowSquareOut weight='bold' className={mx(getSize(4), 'inline-block leading-none mis-1')} />
      </a>
    </StrictMode>,
  );
};

const Key: FC<{ char: string }> = ({ char }) => (
  <span className='flex justify-center items-center w-[24px] h-[24px] rounded text-xs bg-neutral-200 text-black'>
    {char}
  </span>
);

const onCommentsHover: CommentsOptions['onHover'] = (el, shortcut) => {
  createRoot(el).render(
    <StrictMode>
      <div className='flex items-center gap-2 px-2 py-2 bg-neutral-700 text-white text-xs rounded'>
        <div>Create comment</div>
        <div className='flex gap-1'>
          {keySymbols(parseShortcut(shortcut)).map((char) => (
            <Key key={char} char={char} />
          ))}
        </div>
      </div>
    </StrictMode>,
  );
};

const renderLinkButton = (el: Element, url: string) => {
  createRoot(el).render(
    <StrictMode>
      <a href={url} target='_blank' rel='noreferrer' className={hover}>
        <ArrowSquareOut weight='bold' className={mx(getSize(4), 'inline-block leading-none mis-1 mb-[2px]')} />
      </a>
    </StrictMode>,
  );
};

//
// Story
//

type StoryProps = {
  id?: string;
  text?: string;
  readonly?: boolean;
  placeholder?: string;
} & Pick<UseTextEditorProps, 'selection' | 'extensions'>;

const Story = ({
  id = 'editor-' + PublicKey.random().toHex().slice(0, 8),
  text,
  extensions,
  readonly,
  placeholder = 'New document.',
  selection,
}: StoryProps) => {
  const [object] = useState(createEchoObject(create(Expando, { content: text ?? '' })));
  const { themeMode } = useThemeContext();
  const { parentRef, focusAttributes } = useTextEditor(
    () => ({
      id,
      initialValue: text,
      extensions: [
        createDataExtensions({ id, text: createDocAccessor(object, ['content']) }),
        createBasicExtensions({ readonly, placeholder }),
        createMarkdownExtensions({ themeMode }),
        createThemeExtensions({
          themeMode,
          slots: {
            content: {
              className: editorContent,
            },
          },
        }),
        extensions || [],
      ],
      selection,
    }),
    [object, extensions, themeMode],
  );

  return <div role='none' className='flex w-full overflow-hidden' ref={parentRef} {...focusAttributes} />;
};

export default {
  title: 'react-ui-editor/TextEditor',
  decorators: [withTheme, withFullscreen()],
  render: Story,
  parameters: { translations, layout: 'fullscreen' },
};

const defaults = [
  autocomplete({
    onSearch: (text) => links.filter(({ label }) => label.toLowerCase().includes(text.toLowerCase())),
  }),
  decorateMarkdown({ renderLinkButton, selectionChangeDelay: 100, numberedHeadings: { from: 1, to: 4 } }),
  formattingKeymap(),
  image(),
  table(),
  linkTooltip(renderLinkTooltip),
];

export const Default = {
  render: () => <Story text={text} extensions={defaults} />,
};

export const Readonly = {
  render: () => <Story text={text} extensions={defaults} readonly />,
};

export const Empty = {
  render: () => <Story extensions={defaults} />,
};

export const NoExtensions = {
  render: () => <Story text={text} />,
};

export const Folding = {
  render: () => <Story text={text} extensions={[folding]} />,
};

const large = faker.helpers.multiple(() => faker.lorem.paragraph({ min: 8, max: 16 }), { count: 20 }).join('\n\n');

const largeWithImages = faker.helpers
  .multiple(() => [faker.lorem.paragraph({ min: 12, max: 16 }), img], { count: 20 })
  .flatMap((x) => x)
  .join('\n\n');

const headings = str(
  ...[1, 2, 2, 3, 3, 4, 4, 4, 5, 5, 2, 3, 3, 2, 2, 6, 1]
    .map((level) => ['#'.repeat(level) + ' ' + faker.lorem.sentence(3), faker.lorem.sentences(), ''])
    .flat(),
);

export const Headings = {
  render: () => <Story text={headings} extensions={decorateMarkdown({ numberedHeadings: { from: 2, to: 4 } })} />,
};

const global = new Map<string, SelectionState>();

export const Scrolling = {
  render: () => (
    <Story
      text={str('# Large Document', '', large)}
      extensions={state({
        setState: (id, state) => global.set(id, state),
        getState: (id) => global.get(id),
      })}
    />
  ),
};

export const ScrollingWithImages = {
  render: () => <Story text={str('# Large Document', '', largeWithImages)} extensions={[image()]} />,
};

export const Links = {
  render: () => <Story text={str(content.links, content.footer)} extensions={[linkTooltip(renderLinkTooltip)]} />,
};

export const Image = {
  render: () => <Story text={str(content.image, content.footer)} extensions={[image()]} />,
};

export const Code = {
  render: () => <Story text={str(content.code, content.footer)} extensions={[decorateMarkdown()]} />,
};

export const Lists = {
  render: () => (
    <Story
      text={str(content.tasks, '', content.bullets, '', content.numbered, content.footer)}
      extensions={[decorateMarkdown()]}
    />
  ),
};

export const BulletList = {
  render: () => <Story text={str(content.bullets, content.footer)} extensions={[decorateMarkdown()]} />,
};

export const OrderedList = {
  render: () => <Story text={str(content.numbered, content.footer)} extensions={[decorateMarkdown()]} />,
};

export const TaskList = {
  render: () => <Story text={str(content.tasks, content.footer)} extensions={[decorateMarkdown()]} />,
};

export const Table = {
  render: () => <Story text={str(content.table, content.footer)} extensions={[table()]} />,
};

export const Autocomplete = {
  render: () => (
    <Story
      text={str('# Autocomplete', '', 'Press Ctrl-Space...', content.footer)}
      extensions={[
        decorateMarkdown({ renderLinkButton }),
        autocomplete({
          onSearch: (text) => links.filter(({ label }) => label.toLowerCase().includes(text.toLowerCase())),
        }),
      ]}
    />
  ),
};

export const CommentedOut = {
  render: () => (
    <Story
      text={str('# Commented out', '', content.comment, content.footer)}
      extensions={[
        decorateMarkdown(),
        markdown(),
        // commentBlock()
      ]}
    />
  ),
};

export const Mention = {
  render: () => (
    <Story
      text={str('# Mention', '', 'Type @...', content.footer)}
      extensions={[
        mention({
          onSearch: (text) => names.filter((name) => name.toLowerCase().startsWith(text.toLowerCase())),
        }),
      ]}
    />
  ),
};

const CommandDialog: FC<{ onClose: (action?: CommandAction) => void }> = ({ onClose }) => {
  const [text, setText] = useState('');
  const handleInsert = () => {
    onClose(text.length ? { insert: text + '\n' } : undefined);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'Enter': {
        handleInsert();
        break;
      }
      case 'Escape': {
        onClose();
        break;
      }
    }
  };

  return (
    <DensityProvider density='fine'>
      <div className={mx('flex items-center p-2 gap-2 border rounded-md', baseSurface)}>
        <Input.Root>
          <Input.TextInput
            autoFocus={true}
            placeholder='Enter command.'
            value={text}
            onChange={({ target: { value } }) => setText(value)}
            onKeyDown={handleKeyDown}
          />
        </Input.Root>
        <Button variant='ghost' classNames='pli-0' onClick={() => onClose()}>
          <X className={getSize(5)} />
        </Button>
      </div>
    </DensityProvider>
  );
};

const renderCommandDialog: CommandOptions['onRender'] = (el, onClose) => {
  createRoot(el).render(
    <StrictMode>
      <ThemeProvider tx={defaultTx}>
        <CommandDialog onClose={onClose} />
      </ThemeProvider>
    </StrictMode>,
  );
};

export const Command = {
  render: () => (
    <Story
      text={str('# Command', '')}
      extensions={[command({ onRender: renderCommandDialog, onHint: () => 'Press / for commands.' })]}
    />
  ),
};

export const Comments = {
  render: () => {
    const _comments = useSignal<Comment[]>([]);
    return (
      <Story
        text={str('# Comments', '', content.paragraphs, content.footer)}
        extensions={[
          createExternalCommentSync(
            'test',
            (sink) => effect(() => sink()),
            () => _comments.value,
          ),
          comments({
            id: 'test',
            onHover: onCommentsHover,
            onCreate: ({ cursor }) => {
              const id = PublicKey.random().toHex();
              _comments.value = [..._comments.value, { id, cursor }];
              return id;
            },
            onSelect: (state) => {
              const debug = false;
              if (debug) {
                console.log(
                  'update',
                  JSON.stringify({
                    comments: state.comments.length,
                    active: state.selection.current?.slice(0, 8),
                    closest: state.selection.closest?.slice(0, 8),
                  }),
                );
              }
            },
          }),
        ]}
      />
    );
  },
};

export const Vim = {
  render: () => (
    <Story
      text={str('# Vim Mode', '', 'The distant future. The year 2000.', '', content.paragraphs)}
      extensions={[defaults, InputModeExtensions.vim]}
    />
  ),
};

export const Annotations = {
  render: () => <Story text={str('# Annotations', '', large)} extensions={[annotations({ match: /volup/gi })]} />,
};

export const DND = {
  render: () => (
    <Story
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

const typewriterItems = localStorage.getItem('dxos.org/plugin/markdown/typewriter')?.split(',');

export const Listener = {
  render: () => (
    <Story
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

export const Typewriter = {
  render: () => (
    <Story
      text={str('# Typewriter', '', content.paragraphs, content.footer)}
      extensions={[typewriter({ items: typewriterItems })]}
    />
  ),
};

export const Blast = {
  render: () => (
    <Story
      text={str('# Blast', '', content.paragraphs, content.code, content.paragraphs)}
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
