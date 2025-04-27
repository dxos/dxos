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
import { effect, useSignal } from '@preact/signals-react';
import defaultsDeep from 'lodash.defaultsdeep';
import React, { useEffect, useState, type FC, type KeyboardEvent } from 'react';

import { Expando } from '@dxos/echo-schema';
import { keySymbols, parseShortcut } from '@dxos/keyboard';
import { PublicKey } from '@dxos/keys';
import { create } from '@dxos/live-object';
import { log } from '@dxos/log';
import { faker } from '@dxos/random';
import { createDocAccessor, createObject } from '@dxos/react-client/echo';
import { Button, Icon, IconButton, Input, useThemeContext } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { type Meta, withLayout, withTheme } from '@dxos/storybook-utils';

import { editorContent, editorGutter, editorMonospace, editorWidth } from './defaults';
import {
  type Action,
  type DebugNode,
  type EditorSelectionState,
  InputModeExtensions,
  type PreviewOptions,
  type PreviewLinkRef,
  type PreviewLinkTarget,
  type PreviewRenderProps,
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
  linkTooltip,
  listener,
  mention,
  preview,
  selectionState,
  table,
  typewriter,
} from './extensions';
import { useTextEditor, type UseTextEditorProps } from './hooks';
import translations from './translations';
import { type Comment } from './types';
import { createRenderer } from './util';

faker.seed(101);

const str = (...lines: string[]) => lines.join('\n');

const num = () => faker.number.int({ min: 0, max: 9999 }).toLocaleString();

const img = '![dxos](https://dxos.network/dxos-logotype-blue.png)';

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

const LinkTooltip: FC<{ url: string }> = ({ url }) => {
  const web = new URL(url);
  return (
    <a href={url} target='_blank' rel='noreferrer' className={mx(hover, 'flex items-center gap-2')}>
      {web.origin}
      <Icon icon='ph--arrow-square-out--regular' size={4} />
    </a>
  );
};

const renderLinkTooltip = createRenderer(LinkTooltip);

const LinkButton: FC<{ url: string }> = ({ url }) => {
  return (
    <a href={url} target='_blank' rel='noreferrer' className={mx(hover)}>
      <Icon icon='ph--arrow-square-out--regular' size={4} classNames='inline-block mis-1 mb-[3px]' />
    </a>
  );
};

const renderLinkButton = createRenderer(LinkButton);

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
  decorateMarkdown({ renderLinkButton, selectionChangeDelay: 100, numberedHeadings: { from: 2, to: 4 } }),
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
// Preview
//

export const Preview = {
  render: () => (
    <DefaultStory
      text={str(
        '# Preview',
        '',
        'This project is part of the [DXOS][dxn:queue:data:123] SDK.',
        '',
        '![DXOS][?dxn:queue:data:123]',
        '',
        'It consists of [ECHO][dxn:queue:data:echo], [HALO][dxn:queue:data:halo], and [MESH][dxn:queue:data:mesh].',
        '',
        '## Deep dive',
        '',
        '![ECHO][dxn:queue:data:echo]',
        '',
      )}
      extensions={[
        image(),
        preview({
          renderBlock: createRenderer(PreviewBlock),
          renderPopover: createRenderer(PreviewCard),
          onLookup: handlePreviewLookup,
        }),
      ]}
    />
  ),
};

const handlePreviewLookup = async (link: PreviewLinkRef): Promise<PreviewLinkTarget> => {
  // Random text.
  faker.seed(link.dxn.split(':').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 1));
  const text = Array.from({ length: 2 }, () => faker.lorem.paragraphs()).join('\n\n');
  return {
    label: link.label,
    text,
  };
};

// Async lookup.
// TODO(burdon): Handle error.s
const useRefTarget = (link: PreviewLinkRef, onLookup: PreviewOptions['onLookup']): PreviewLinkTarget | undefined => {
  const [target, setTarget] = useState<PreviewLinkTarget>();
  useEffect(() => {
    void onLookup(link).then((target) => setTarget(target));
  }, [link, onLookup]);

  return target;
};

const PreviewCard: FC<PreviewRenderProps> = ({ readonly, link, onAction, onLookup }) => {
  const target = useRefTarget(link, onLookup);
  return (
    <div className='flex flex-col gap-2'>
      <div className='grow truncate'>{link.label}</div>
      {target && <div className='line-clamp-3'>{target.text}</div>}
    </div>
  );
};

// TODO(burdon): Replace with card.
const PreviewBlock: FC<PreviewRenderProps> = ({ readonly, link, onAction, onLookup }) => {
  const target = useRefTarget(link, onLookup);
  return (
    <div className='group flex flex-col gap-2'>
      <div className='flex items-center gap-4'>
        <div className='grow truncate'>
          {/* <span className='text-xs text-subdued mie-2'>Prompt</span> */}
          {link.label}
        </div>
        {!readonly && (
          <div className='flex gap-1'>
            {(link.suggest && (
              <>
                {target && (
                  <IconButton
                    classNames='text-green-500'
                    label='Apply'
                    icon={'ph--check--regular'}
                    onClick={() => onAction({ type: 'insert', link, target })}
                  />
                )}
                <IconButton
                  classNames='text-red-500'
                  label='Cancel'
                  icon={'ph--x--regular'}
                  onClick={() => onAction({ type: 'delete', link })}
                />
              </>
            )) || (
              <IconButton
                iconOnly
                label='Delete'
                icon={'ph--x--regular'}
                classNames='transition-opacity duration-300 opacity-0 group-hover:opacity-100'
                onClick={() => onAction({ type: 'delete', link })}
              />
            )}
          </div>
        )}
      </div>
      {target && <div className='line-clamp-3'>{target.text}</div>}
    </div>
  );
};

//
// Command
//

export const Command = {
  render: () => (
    <DefaultStory
      text={str(
        '# Preview',
        '',
        'This project is part of the [DXOS][dxn:queue:data:123] SDK.',
        '',
        '![DXOS][dxn:queue:data:123]',
        '',
      )}
      extensions={[
        preview({
          renderBlock: createRenderer(PreviewBlock),
          renderPopover: createRenderer(PreviewCard),
          onLookup: handlePreviewLookup,
        }),
        command({
          renderMenu: createRenderer(CommandMenu),
          renderDialog: createRenderer(CommandDialog),
          onHint: () => 'Press / for commands.',
        }),
      ]}
    />
  ),
};

const CommandMenu = ({ onAction }: { onAction: () => void }) => {
  return (
    <Button classNames='p-1 aspect-square' onClick={onAction}>
      <Icon icon='ph--sparkle--regular' size={5} />
    </Button>
  );
};

const CommandDialog = ({ onAction }: { onAction: (action?: Action) => void }) => {
  const [text, setText] = useState('');

  const handleInsert = () => {
    // TODO(burdon): Use queue ref.
    const link = `[${text}](dxn:queue:data:123)`;
    onAction(text.length ? { type: 'insert', text: link } : undefined);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'Enter': {
        handleInsert();
        break;
      }
      case 'Escape': {
        onAction();
        break;
      }
    }
  };

  return (
    <div className='flex w-full justify-center'>
      <div
        className={mx(
          'flex w-full p-2 gap-2 items-center bg-modalSurface border border-separator rounded-md',
          editorWidth,
        )}
      >
        <Input.Root>
          <Input.TextInput
            autoFocus={true}
            placeholder='Ask a question...'
            value={text}
            onChange={(ev) => setText(ev.target.value)}
            onKeyDown={handleKeyDown}
          />
        </Input.Root>
        <Button variant='ghost' classNames='pli-0' onClick={() => onAction({ type: 'cancel' })}>
          <Icon icon='ph--x--regular' size={5} />
        </Button>
      </div>
    </div>
  );
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
            renderTooltip: createRenderer(CommentTooltip),
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

const Key: FC<{ char: string }> = ({ char }) => (
  <span className='flex justify-center items-center w-[24px] h-[24px] rounded text-xs bg-neutral-200 text-black'>
    {char}
  </span>
);

const CommentTooltip: FC<{ shortcut: string }> = ({ shortcut }) => {
  return (
    <div className='flex items-center gap-2 px-2 py-2 bg-neutral-700 text-white text-xs rounded'>
      <div>Create comment</div>
      <div className='flex gap-1'>
        {keySymbols(parseShortcut(shortcut)).map((char) => (
          <Key key={char} char={char} />
        ))}
      </div>
    </div>
  );
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
