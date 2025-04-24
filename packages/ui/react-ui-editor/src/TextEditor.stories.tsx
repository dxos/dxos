//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Completion } from '@codemirror/autocomplete';
import { javascript } from '@codemirror/lang-javascript';
import { markdown } from '@codemirror/lang-markdown';
import { openSearchPanel } from '@codemirror/search';
import { type Extension } from '@codemirror/state';
import { type EditorView } from '@codemirror/view';
import { X } from '@phosphor-icons/react';
import { effect, useSignal } from '@preact/signals-react';
import defaultsDeep from 'lodash.defaultsdeep';
import React, { useEffect, useState, type FC, type KeyboardEvent } from 'react';
import { createRoot } from 'react-dom/client';

import { Expando } from '@dxos/echo-schema';
import { keySymbols, parseShortcut } from '@dxos/keyboard';
import { PublicKey } from '@dxos/keys';
import { create } from '@dxos/live-object';
import { log } from '@dxos/log';
import { faker } from '@dxos/random';
import { createDocAccessor, createObject } from '@dxos/react-client/echo';
import { Button, Icon, IconButton, Input, ThemeProvider, useThemeContext } from '@dxos/react-ui';
import { baseSurface, defaultTx, getSize, mx } from '@dxos/react-ui-theme';
import { type Meta, withLayout, withTheme } from '@dxos/storybook-utils';

import { editorContent, editorGutter, editorMonospace } from './defaults';
import {
  annotations,
  autocomplete,
  blast,
  command,
  comments,
  createBasicExtensions,
  createDataExtensions,
  createExternalCommentSync,
  createMarkdownExtensions,
  createThemeExtensions,
  debugTree,
  decorateMarkdown,
  defaultOptions,
  dropFile,
  folding,
  formattingKeymap,
  image,
  InputModeExtensions,
  linkTooltip,
  listener,
  mention,
  selectionState,
  table,
  typewriter,
  type CommandAction,
  type CommentsOptions,
  type DebugNode,
  type EditorSelectionState,
} from './extensions';
import { useTextEditor, type UseTextEditorProps } from './hooks';
import translations from './translations';
import { type Comment } from './types';
import { renderRoot } from './util';

faker.seed(101);

const str = (...lines: string[]) => lines.join('\n');

const num = () => faker.number.int({ min: 0, max: 9999 }).toLocaleString();

const img = '![dxos](https://pbs.twimg.com/profile_banners/1268328127673044992/1684766689/1500x500)';

const code = str(
  '// Code',
  'const Component = () => {',
  '  const x = 100;',
  '',
  '  return () => <div>Test</div>;',
  '};',
);

const content = {
  tasks: str(
    //
    '### TaskList',
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

  typescript: code,

  codeblocks: str('### Code', '', '```bash', '$ ls -las', '```', '', '```tsx', code, '```', ''),

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

  formatting: str('### Formatting', '', 'This this is **bold**, ~~strikethrough~~, _italic_, and `f(INLINE)`.', ''),

  blockquotes: str(
    '### Blockquotes',
    '',
    '> This is a block quote.',
    '',
    '> This is a long wrapping block quote. Neque reiciendis ullam quae error labore sit, at, et, nulla, aut at nostrum omnis quas nostrum, at consectetur vitae eos asperiores non omnis ullam in beatae at vitae deserunt asperiores sapiente.',
    '',
    '> This is ...',
    '... a multi-line ...',
    'block quote.',
    '',
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
  '## Misc',
  content.codeblocks,
  content.table,
  content.image,
  content.footer,
  '=== LAST LINE ===',
);

const links: Completion[] = [
  { label: 'DXOS', apply: '[DXOS](https://dxos.org)' },
  { label: 'GitHub', apply: '[DXOS GitHub](https://github.com/dxos)' },
  { label: 'Automerge', apply: '[Automerge](https://automerge.org/)' },
  { label: 'IPFS', apply: '[Protocol Labs](https://docs.ipfs.tech)' },
  { label: 'StackEdit', apply: '[StackEdit](https://stackedit.io/app)' },
];

const names = ['adam', 'alice', 'alison', 'bob', 'carol', 'charlie', 'sayuri', 'shoko'];

const hover =
  'rounded-sm text-baseText text-primary-600 hover:text-primary-500 dark:text-primary-300 hover:dark:text-primary-200';

const Key: FC<{ char: string }> = ({ char }) => (
  <span className='flex justify-center items-center w-[24px] h-[24px] rounded text-xs bg-neutral-200 text-black'>
    {char}
  </span>
);

const onCommentsHover: CommentsOptions['onHover'] = (el, shortcut) => {
  createRoot(el).render(
    <div className='flex items-center gap-2 px-2 py-2 bg-neutral-700 text-white text-xs rounded'>
      <div>Create comment</div>
      <div className='flex gap-1'>
        {keySymbols(parseShortcut(shortcut)).map((char) => (
          <Key key={char} char={char} />
        ))}
      </div>
    </div>,
  );
};

const renderLinkTooltip = (el: Element, url: string) => {
  const web = new URL(url);
  createRoot(el).render(
    <ThemeProvider tx={defaultTx}>
      <a href={url} target='_blank' rel='noreferrer' className={mx(hover, 'flex items-center gap-2')}>
        {web.origin}
        <Icon icon='ph--arrow-square-out--regular' size={4} />
      </a>
    </ThemeProvider>,
  );
};

const renderLinkButton = (el: Element, url: string) => {
  createRoot(el).render(
    <ThemeProvider tx={defaultTx}>
      <a href={url} target='_blank' rel='noreferrer' className={mx(hover)}>
        <Icon icon='ph--arrow-square-out--regular' size={4} classNames='inline-block mis-1 mb-[3px]' />
      </a>
    </ThemeProvider>,
  );
};

//
// Story
//

type DebugMode = 'raw' | 'tree' | 'raw+tree';

type StoryProps = {
  id?: string;
  debug?: DebugMode;
  text?: string;
  readOnly?: boolean;
  placeholder?: string;
  lineNumbers?: boolean;
  onReady?: (view: EditorView) => void;
} & Pick<UseTextEditorProps, 'scrollTo' | 'selection' | 'extensions'>;

const DefaultStory = ({
  id = 'editor-' + PublicKey.random().toHex().slice(0, 8),
  debug,
  text,
  extensions,
  readOnly,
  placeholder = 'New document.',
  scrollTo,
  selection,
  lineNumbers,
  onReady,
}: StoryProps) => {
  const [object] = useState(createObject(create(Expando, { content: text ?? '' })));
  const { themeMode } = useThemeContext();
  const [tree, setTree] = useState<DebugNode>();
  const { parentRef, focusAttributes, view } = useTextEditor(
    () => ({
      id,
      initialValue: text,
      extensions: [
        createDataExtensions({ id, text: createDocAccessor(object, ['content']) }),
        createBasicExtensions({ readOnly, placeholder, lineNumbers, scrollPastEnd: true }),
        createMarkdownExtensions({ themeMode }),
        createThemeExtensions({
          themeMode,
          syntaxHighlighting: true,
          slots: {
            content: {
              className: editorContent,
            },
          },
        }),
        editorGutter,
        extensions || [],
        debug ? debugTree(setTree) : [],
      ],
      scrollTo,
      selection,
    }),
    [object, extensions, themeMode],
  );

  useEffect(() => {
    if (view) {
      onReady?.(view);
    }
  }, [view]);

  return (
    <div className='flex w-full'>
      <div role='none' className='flex w-full overflow-hidden' ref={parentRef} {...focusAttributes} />
      {debug && (
        <div className='flex flex-col w-[800px] border-l border-separator divide-y divide-separator overflow-auto'>
          {(debug === 'raw' || debug === 'raw+tree') && (
            <pre className='p-1 font-mono text-xs text-green-800 dark:text-green-200'>{view?.state.doc.toString()}</pre>
          )}
          {(debug === 'tree' || debug === 'raw+tree') && (
            <pre className='p-1 font-mono text-xs text-green-800 dark:text-green-200'>
              {JSON.stringify(tree, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'ui/react-ui-editor/TextEditor',
  decorators: [withTheme, withLayout({ fullscreen: true })],
  render: DefaultStory,
  parameters: { translations, layout: 'fullscreen' },
};

export default meta;

const defaultExtensions: Extension[] = [
  decorateMarkdown({ renderLinkButton, selectionChangeDelay: 100 }),
  formattingKeymap(),
  linkTooltip(renderLinkTooltip),
];

const allExtensions: Extension[] = [
  decorateMarkdown({ numberedHeadings: { from: 2, to: 4 }, renderLinkButton, selectionChangeDelay: 100 }),
  formattingKeymap(),
  linkTooltip(renderLinkTooltip),
  image(),
  table(),
  folding(),
];

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

const longText = faker.helpers.multiple(() => faker.lorem.paragraph({ min: 8, max: 16 }), { count: 20 }).join('\n\n');

const largeWithImages = faker.helpers
  .multiple(() => [faker.lorem.paragraph({ min: 12, max: 16 }), img], { count: 20 })
  .flatMap((x) => x)
  .join('\n\n');

const headings = str(
  ...[1, 2, 2, 3, 3, 4, 4, 4, 5, 5, 2, 3, 3, 2, 2, 6, 1]
    .map((level) => ['#'.repeat(level) + ' ' + faker.lorem.sentence(3), faker.lorem.sentences(), ''])
    .flat(),
);

const global = new Map<string, EditorSelectionState>();

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

export const BulletList = {
  render: () => <DefaultStory text={str(content.bullets, content.footer)} extensions={[decorateMarkdown()]} />,
};

export const OrderedList = {
  render: () => <DefaultStory text={str(content.numbered, content.footer)} extensions={[decorateMarkdown()]} />,
};

export const TaskList = {
  render: () => (
    <DefaultStory text={str(content.tasks, content.footer)} extensions={[decorateMarkdown()]} debug='raw+tree' />
  ),
};

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

//
// Command
//

const CommandDialog = ({ onClose }: { onClose: (action?: CommandAction) => void }) => {
  const [text, setText] = useState('');
  const handleInsert = () => {
    // TODO(burdon): Use queue ref.
    const link = `[${text}](dxn:queue:data:123)`;
    console.log({ link });
    onClose(text.length ? { insert: link } : undefined);
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
    <div className='flex w-full justify-center'>
      <div className={mx('flex w-full p-2 gap-2 items-center border rounded-md', editorContent, baseSurface)}>
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
    </div>
  );
};

export const Command = {
  render: () => (
    <DefaultStory
      text={str('# Command', '', '', '[Test](dxn:queue:data:123)', '', '', '')}
      extensions={[
        command({
          onHint: () => 'Press / for commands.',
          onRenderMenu: (el, onClick) => {
            renderRoot(
              el,
              <ThemeProvider tx={defaultTx}>
                <Button classNames='p-1 aspect-square' onClick={onClick}>
                  <Icon icon={'ph--sparkle--regular'} size={5} />
                </Button>
              </ThemeProvider>,
            );
          },
          onRenderDialog: (el, onClose) => {
            renderRoot(el, <CommandDialog onClose={onClose} />);
          },
          onRenderPreview: (el, url, text) => {
            faker.seed(text.length);
            const data = Array.from({ length: 2 }, () => faker.lorem.sentences(2));
            renderRoot(
              el,
              <ThemeProvider tx={defaultTx}>
                <div className='flex flex-col gap-2'>
                  <div className='flex items-center gap-2'>
                    <div className='flex-1'>{text}</div>
                    <div className='flex gap-1'>
                      <IconButton classNames='text-green-500' label='Apply' icon={'ph--check--regular'} />
                      <IconButton classNames='text-red-500' label='Cancel' icon={'ph--x--regular'} />
                    </div>
                  </div>
                  <div>{data.join('\n\n')}</div>
                </div>
              </ThemeProvider>,
            );
          },
        }),
      ]}
    />
  ),
};

//
// Comments
//

export const Comments = {
  render: () => {
    const _comments = useSignal<Comment[]>([]);
    return (
      <DefaultStory
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

//
// Annotations
//

export const Annotations = {
  render: () => (
    <DefaultStory text={str('# Annotations', '', longText)} extensions={[annotations({ match: /volup/gi })]} />
  ),
};

//
// DND
//

export const DND = {
  render: () => (
    <DefaultStory
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

//
// Listener
//

export const Listener = {
  render: () => (
    <DefaultStory
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
    <DefaultStory
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
    <DefaultStory
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
