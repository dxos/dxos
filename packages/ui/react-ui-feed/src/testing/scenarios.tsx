//
// Copyright 2026 DXOS.org
//

import React, { type ComponentType } from 'react';

import { random } from '@dxos/random';
import { IconButton } from '@dxos/react-ui';
import { type ContentBlock, Message } from '@dxos/types';
import { type XmlWidgetRegistry } from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';

import { type MessageChromeProps, type MessageRenderer, chatRenderer, defaultRenderer } from '../';
import {
  BareEditorItem,
  DecoratedEditorItem,
  MarkdownEditorItem,
  MarkdownProbeItem,
  TextItem,
  ThemedEditorItem,
} from './controls';
import { chatRegistry } from './widgets';

const UNIFORM_CONTROLS = {
  'uniform-text': TextItem,
  'uniform-bare': BareEditorItem,
  'uniform-themed': ThemedEditorItem,
  'uniform-markdown': MarkdownEditorItem,
  'uniform-decorated': DecoratedEditorItem,
  'uniform-item': MarkdownProbeItem,
} as const;

/**
 * The five places in the repo that render a thread of messages, approximated against one engine.
 *
 * The point is not the fixtures — it is that all five differ only in the renderer, the chrome and a
 * couple of options, while the list, the virtualization, the selection and the search are the same
 * code. Where a scenario needs something the engine does not have, that is the finding.
 */
export type FeedScenario =
  /** No editor at all: fixed-height divs, so the list is measured against content that cannot move. */
  | 'plain'
  /** One editor per row, every row identical — the same document, so every height is the same. */
  | 'uniform'
  /** The `uniform` rows with their text as a paragraph: the same feed without a document at all. */
  | 'uniform-text'
  /** The `uniform` rows with an editor carrying nothing but line wrapping. */
  | 'uniform-bare'
  /** The `uniform` rows with wrapping and the theme, but no markdown and no decoration. */
  | 'uniform-themed'
  /** The `uniform` rows with the markdown language, but nothing drawn from what it parses. */
  | 'uniform-markdown'
  /** The `uniform` rows with markdown drawn as itself: headings, lists, links. */
  | 'uniform-decorated'
  /** The `uniform` rows rendered by the real item, reached through `Custom` like the probes. */
  | 'uniform-item'
  | 'assistant'
  | 'email'
  | 'thread'
  | 'comments'
  | 'transcript';

export type ScenarioDefinition = {
  messages: Message.Message[];
  renderer: MessageRenderer;
  /** Widgets for the tags the renderer emits; only the assistant turn has non-prose blocks. */
  registry?: XmlWidgetRegistry;
  Chrome: ComponentType<MessageChromeProps>;
  /** Renders a `custom` item, for the scenarios that deliberately avoid an editor. */
  Custom?: ComponentType<{ content: any; message: Message.Message }>;
  /** Whether the feed follows its tail: true where messages arrive, false where they are read. */
  stickyBottom: boolean;
  /**
   * Height a row is assumed to have before it is measured. A function where rows differ widely: a
   * one-line prompt and a long answer share no useful average, and a row measured for the first time
   * re-lays everything below it — which the reader sees as flicker when scrolling up, into rows that
   * have never been measured.
   */
  estimateSize: number | ((message: Message.Message, index: number) => number);
  /** Which messages the arrows and the navigation buttons stop on. */
  isAnchor?: (message: Message.Message, index: number) => boolean;
};

export type ScenarioOptions = {
  scenario: FeedScenario;
  count: number;
  seed?: number;
};

export const createScenario = ({ scenario, count, seed = 999 }: ScenarioOptions): ScenarioDefinition => {
  random.seed(seed);
  switch (scenario) {
    // The control: nothing here builds anything after it mounts, so a row's first measurement is its
    // last. Any movement in this feed belongs to the list, not to what it is rendering.
    case 'plain':
      return {
        messages: createPlainMessages(count),
        renderer: (message) => ({ kind: 'custom', key: 'plain', data: message.properties?.height ?? 120 }),
        Chrome: PlainChrome,
        Custom: PlainItem,
        stickyBottom: true,
        estimateSize: (message) => Number(message.properties?.height ?? 120) + PLAIN_CHROME,
      };

    // One rung up: a real editor per row, but every row the same single paragraph, so every row is
    // the same height and the estimate can be exactly right.
    case 'uniform':
      return {
        messages: createUniformMessages(count),
        renderer: defaultRenderer,
        Chrome: PlainChrome,
        stickyBottom: true,
        estimateSize: UNIFORM_HEIGHT,
      };

    // The controls for `uniform`: identical messages, identical chrome, identical estimate — only
    // what the row contains changes, so the difference between any two of them is that content.
    case 'uniform-text':
    case 'uniform-bare':
    case 'uniform-themed':
    case 'uniform-markdown':
    case 'uniform-decorated':
    case 'uniform-item':
      return {
        messages: createUniformMessages(count),
        renderer: (message) => ({ kind: 'custom', key: scenario, data: Message.extractText(message) }),
        Chrome: PlainChrome,
        Custom: UNIFORM_CONTROLS[scenario],
        stickyBottom: true,
        estimateSize: 84,
      };

    case 'assistant':
      return {
        messages: createAssistantMessages(count),
        renderer: chatRenderer,
        registry: chatRegistry,
        Chrome: AssistantChrome,
        stickyBottom: true,
        estimateSize: estimateAssistantRow,
        // A turn is a prompt and everything the model said in reply; stopping on each of the model's
        // messages would make the reader step through an answer rather than through the conversation.
        isAnchor: (message) => message.sender.role === 'user',
      };

    case 'email':
      return {
        messages: createEmailMessages(count),
        renderer: defaultRenderer,
        Chrome: EmailChrome,
        // A conversation is read from its start; the newest message is not where the reader is going.
        stickyBottom: false,
        estimateSize: 220,
      };

    case 'thread':
      return {
        messages: createThreadMessages(count),
        renderer: defaultRenderer,
        Chrome: ThreadChrome,
        stickyBottom: true,
        estimateSize: 64,
      };

    case 'comments':
      return {
        messages: createCommentMessages(count),
        renderer: defaultRenderer,
        Chrome: CommentChrome,
        stickyBottom: false,
        estimateSize: 96,
      };

    case 'transcript':
      return {
        messages: createTranscriptMessages(count),
        renderer: defaultRenderer,
        Chrome: TranscriptChrome,
        stickyBottom: true,
        estimateSize: 48,
      };
  }
};

/** Chrome around every assistant row: the sender line, the padding and the separator. */
const ROW_CHROME = 46;

/** Height of a wrapped line of body text, and how many characters fit on one at the story's width. */
const LINE_HEIGHT = 24;
const LINE_CHARS = 90;

/** A collapsed panel: reasoning, a tool call, a tool result. */
const PANEL_HEIGHT = 50;

/**
 * What a row will measure, from the message alone.
 *
 * Rough on purpose — it is an estimate, and its only job is to be close enough that measuring the row
 * does not move the rows below it. Text is counted in wrapped lines, blank lines between blocks are
 * counted, and every block that renders as a widget is counted at its collapsed height.
 */
const estimateAssistantRow = (message: Message.Message): number => {
  let height = ROW_CHROME;
  for (const block of message.blocks) {
    switch (block._tag) {
      case 'text': {
        const paragraphs = block.text.split('\n\n');
        for (const paragraph of paragraphs) {
          height += Math.max(1, Math.ceil(paragraph.length / LINE_CHARS)) * LINE_HEIGHT;
        }
        break;
      }
      case 'suggestion':
        height += LINE_HEIGHT + 8;
        break;
      case 'select':
        height += block.options.length * (LINE_HEIGHT + 10);
        break;
      default:
        height += PANEL_HEIGHT;
    }
  }

  return height;
};

//
// Fixtures
//

/** Fixed heights, cycling so the feed is uneven — but known in advance and never corrected. */
const PLAIN_HEIGHTS = [64, 120, 200, 88, 320, 56];

/**
 * What the chrome adds to a plain row: the separator beneath it.
 *
 * The estimate has to include this. A control scenario whose estimate is the *content* height is off
 * by the chrome on every single row, and the list corrects each one — which looks exactly like the
 * defect the control exists to rule out.
 */
const PLAIN_CHROME = 1;

const createPlainMessages = (count: number): Message.Message[] =>
  Array.from({ length: count }, (_, index) =>
    Message.make({
      created: at(index),
      sender: { role: index % 2 === 0 ? 'user' : 'assistant', name: index % 2 === 0 ? 'Alice' : 'Assistant' },
      blocks: [{ _tag: 'text', text: random.lorem.sentence(index % 8) }],
      properties: { height: PLAIN_HEIGHTS[index % PLAIN_HEIGHTS.length] },
    }),
  );

/**
 * What one uniform row measures, chrome included.
 *
 * Exact on purpose, and checked against the DOM rather than guessed: this scenario's whole job is to
 * be the case where the estimate is right, and it was declared at 84 against a real 24. A viewport
 * filled from an estimate three times too large covers a third of the screen once the rows measure,
 * so the feed arrived in two visible pieces — in the one story that exists to have nothing wrong
 * with it.
 */
const UNIFORM_HEIGHT = 24;

/** Every row the same document, so a single estimate is exactly right for all of them. */
const createUniformMessages = (count: number): Message.Message[] =>
  Array.from({ length: count }, (_, index) =>
    Message.make({
      created: at(index),
      sender: { role: index % 2 === 0 ? 'user' : 'assistant', name: index % 2 === 0 ? 'Alice' : 'Assistant' },
      // Not `${index}. …`: markdown reads a leading number and a dot as an ordered list and renumbers
      // it, so the row would show a number that is not its index. The index is in the chrome.
      blocks: [{ _tag: 'text', text: random.lorem.sentence(index % 16 === 0 ? 100 : 1) }],
    }),
  );

const NAMES = ['Alice', 'Bob', 'Charlie', 'Dana'];

const at = (index: number, step = 60_000) => new Date(Date.now() - (2_000 - index) * step).toISOString();

/** A turn: the reader's prompt, then an answer carrying the block kinds a model actually emits. */
const createAssistantMessages = (count: number): Message.Message[] =>
  Array.from({ length: count }, (_, index) => {
    if (index % 2 === 0) {
      return Message.make({
        created: at(index),
        sender: { role: 'user', name: 'Alice' },
        blocks: [{ _tag: 'text', text: random.lorem.paragraph() }],
      });
    }

    // Every answer is several blocks — reasoning, sometimes a tool round-trip, prose, and closing
    // affordances. A single text block is the easy case and the one the engine already handled.
    const blocks: ContentBlock.Any[] = [{ _tag: 'reasoning', reasoningText: random.lorem.paragraph() }];
    if (index % 4 === 1) {
      const toolCallId = `tool-${index}`;
      blocks.push({
        _tag: 'toolCall',
        toolCallId,
        name: 'search',
        input: '{}',
        providerExecuted: false,
      });
      blocks.push({
        _tag: 'toolResult',
        toolCallId,
        name: 'search',
        result: random.lorem.paragraphs(2),
        providerExecuted: false,
      });
    }

    blocks.push({ _tag: 'text', text: answerText(index) });
    if (index % 6 === 3) {
      blocks.push({ _tag: 'suggestion', text: 'Tell me more' });
      blocks.push({ _tag: 'suggestion', text: 'Show the sources' });
    }
    if (index % 8 === 5) {
      blocks.push({ _tag: 'select', options: ['Option 1', 'Option 2', 'Option 3'] });
    }

    return Message.make({ created: at(index), sender: { role: 'assistant', name: 'Assistant' }, blocks });
  });

const answerText = (index: number): string =>
  [
    `**${index}.** ${random.lorem.sentence(10)}`,
    '',
    random.lorem.paragraph(),
    '',
    `- ${random.lorem.sentence(5)}`,
    `- ${random.lorem.sentence(7)}`,
  ].join('\n');

/** An email conversation: HTML bodies, quoted history, and a subject that never changes. */
const createEmailMessages = (count: number): Message.Message[] => {
  const subject = `Re: ${random.lorem.words(4)}`;
  return Array.from({ length: count }, (_, index) => {
    const from = NAMES[index % NAMES.length];
    return Message.make({
      created: at(index, 3_600_000),
      sender: { role: 'user', name: from, email: `${from.toLowerCase()}@example.com` },
      blocks: [
        {
          _tag: 'text',
          mimeType: 'text/html',
          text: [
            `<p>${random.lorem.paragraph()}</p>`,
            `<p>${random.lorem.paragraph()}</p>`,
            '<ul><li>attachment.pdf</li><li>invoice.csv</li></ul>',
            `<blockquote>${random.lorem.sentence(16)}</blockquote>`,
          ].join(''),
        },
      ],
      properties: { subject },
    });
  });
};

/** Human chat: short turns, many of them, often several in a row from one speaker. */
const createThreadMessages = (count: number): Message.Message[] =>
  Array.from({ length: count }, (_, index) => {
    const name = NAMES[Math.floor(index / 3) % NAMES.length];
    return Message.make({
      created: at(index, 30_000),
      sender: { role: 'user', name },
      blocks: [{ _tag: 'text', text: random.lorem.sentence(random.number.int({ min: 4, max: 20 })) }],
    });
  });

/** Comments: each anchored to a range of a document, and resolvable. */
const createCommentMessages = (count: number): Message.Message[] =>
  Array.from({ length: count }, (_, index) =>
    Message.make({
      created: at(index, 120_000),
      sender: { role: 'user', name: NAMES[index % NAMES.length] },
      blocks: [{ _tag: 'text', text: random.lorem.sentence(random.number.int({ min: 6, max: 24 })) }],
      properties: { anchor: random.lorem.sentence(6), resolved: index % 7 === 0 },
    }),
  );

/** Transcription: one utterance per message, seconds apart, arriving while the reader watches. */
const createTranscriptMessages = (count: number): Message.Message[] =>
  Array.from({ length: count }, (_, index) =>
    Message.make({
      created: at(index, 6_000),
      sender: { role: 'user', name: NAMES[index % 2] },
      blocks: [{ _tag: 'text', text: random.lorem.sentence(random.number.int({ min: 5, max: 18 })) }],
    }),
  );

/**
 * A row of a known height: the content is a box, not a document.
 *
 * The height is the point — it is declared, never measured — so it is stated in the row rather than
 * left to be inferred, and the text sits at the top like every other scenario's does.
 */
const PlainItem = ({ content, message }: { content: { data?: unknown }; message: Message.Message }) => {
  const height = Number(content.data ?? 120);

  return (
    <div className='flex flex-col gap-1 py-2 text-sm' style={{ height }}>
      <div className='flex items-center gap-2 text-xs text-description'>
        <span className='font-medium'>{message.sender.name}</span>
        <span className='tabular-nums'>{height}px</span>
      </div>
      <p>{Message.extractText(message)}</p>
    </div>
  );
};

//
// Chrome
//

/** No hover controls and no separators: nothing here can change a row's height. */
/**
 * The index is shown in the gutter because these are the control scenarios: when a row moves, the
 * first question is *which* row, and reading it off the screen beats hunting for it in the DOM.
 */
const PlainChrome = ({ index, children }: MessageChromeProps) => (
  <Row classNames='py-0 grid grid-cols-[3rem_1fr] gap-2'>
    <div className='self-start flex items-center h-[1lh] text-base leading-normal'>
      <span className='text-xs text-subdued tabular-nums'>{index}</span>
    </div>
    <div className='min-w-0'>{children}</div>
  </Row>
);

//
// Every scenario's difference that is not the renderer lives here — which is the claim being
// tested: chrome is the host's, and the engine only has to keep it out of the measurement.
//

const timeOf = (message: Message.Message, options?: Intl.DateTimeFormatOptions) =>
  new Date(message.created).toLocaleTimeString([], options ?? { hour: '2-digit', minute: '2-digit' });

const Row = ({ children, classNames }: { children: React.ReactNode; classNames?: string }) => (
  <div className={mx('group relative px-2 py-2', classNames)} data-testid='feed.message'>
    {children}
  </div>
);

/**
 * Assistant: the reader's prompts and the model's answers are framed differently, because they are
 * different kinds of thing — a prompt is an instruction that can be rewound to, an answer is a
 * result that can be forked from.
 *
 * A prompt carries its rewind toolbar underneath; an answer carries its timestamp at the foot, where
 * it reads as when the answer finished rather than when the turn began. Both are always in flow — a
 * control that appears on hover changes the row's height, and a pointer travelling down a scrolling
 * list then moves every row below it.
 */
/** Copies the message's extracted text — the model's truth, not the DOM's partial render. */
const CopyButton = ({ message }: { message: Message.Message }) => (
  <IconButton
    icon='ph--copy--regular'
    iconOnly
    label='Copy'
    variant='ghost'
    density='sm'
    onClick={() => void navigator.clipboard?.writeText(Message.extractText(message))}
  />
);

const AssistantChrome = ({ message, index, selected, children }: MessageChromeProps) => {
  const prompt = message.sender.role === 'user';

  return (
    <Row classNames={mx(selected && 'bg-hover-surface')}>
      {prompt ? (
        // The reader's own words sit apart from the model's: right-aligned, at most two thirds of
        // the viewport — the chat convention that makes whose-turn legible at a glance.
        <div className='min-w-0 flex flex-col items-end'>
          <div className='max-w-[66%] min-w-0'>
            {/* The reader's own words, framed: a prompt is an instruction the thread can be rewound
                to, and it reads as one only if it is visibly not the model's prose. */}
            <div className='px-4 py-3 border-s-2 border-accent-bg rounded-sm bg-input-surface'>{children}</div>
            {/* Revealed on hover, but never removed from flow: chrome that appears and disappears
                changes the row's height, and a pointer travelling down a scrolling list would then
                move every row below it. Opacity costs nothing to measure. The toolbar follows the
                bubble's edge — right-aligned, like the words it belongs to. */}
            <div className='flex items-center justify-end gap-1 pt-1 text-xs text-description opacity-0 transition-opacity group-hover:opacity-100'>
              <CopyButton message={message} />
              <IconButton
                icon='ph--arrow-counter-clockwise--regular'
                iconOnly
                label='Rewind'
                variant='ghost'
                density='sm'
              />
              <IconButton icon='ph--git-branch--regular' iconOnly label='Fork' variant='ghost' density='sm' />
              <span className='text-subdued'>#{index}</span>
              <span>{timeOf(message)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className='min-w-0'>
          {children}
          <div className='flex items-center gap-1 pt-1 text-xs text-description opacity-0 transition-opacity group-hover:opacity-100'>
            <CopyButton message={message} />
            <IconButton icon='ph--arrow-bend-up-left--regular' iconOnly label='Reply' variant='ghost' density='sm' />
            <span className='text-subdued'>#{index}</span>
            <span>{timeOf(message)}</span>
          </div>
        </div>
      )}
    </Row>
  );
};

/** Email: a header of its own — sender, address, date — and a card-like body. */
const EmailChrome = ({ message, children }: MessageChromeProps) => (
  <Row classNames='border-b border-separator'>
    <div className='flex items-baseline gap-2'>
      <span className='font-medium'>{message.sender.name}</span>
      <span className='text-xs text-description'>{message.sender.email}</span>
      <span className='grow' />
      <span className='text-xs text-description'>{new Date(message.created).toLocaleString()}</span>
    </div>
    <p className='text-xs text-description'>{String(message.properties?.subject ?? '')}</p>
    <div className='mt-1'>{children}</div>
  </Row>
);

/** Human chat: an avatar, and consecutive turns from one speaker read as one block. */
const ThreadChrome = ({ message, children }: MessageChromeProps) => (
  <Row classNames='grid grid-cols-[2rem_1fr] gap-2'>
    <div className='w-6 h-6 rounded-full bg-input-surface grid place-items-center text-xs'>
      {message.sender.name?.[0]}
    </div>
    <div className='min-w-0'>
      <div className='flex items-center gap-2 text-xs text-description'>
        <span className='font-medium'>{message.sender.name}</span>
        <span>{timeOf(message)}</span>
      </div>
      {children}
    </div>
  </Row>
);

/** Comments: the quoted anchor above the comment, and a resolve control. */
const CommentChrome = ({ message, children }: MessageChromeProps) => (
  <Row classNames={mx('border-b border-subdued-separator', message.properties?.resolved && 'opacity-50')}>
    <p className='mb-1 ps-2 border-s-2 border-separator text-xs text-description line-clamp-1'>
      {String(message.properties?.anchor ?? '')}
    </p>
    <div className='flex items-center gap-2 text-xs text-description'>
      <span className='font-medium'>{message.sender.name}</span>
      <span>{timeOf(message)}</span>
      <span className='grow' />
      <IconButton
        icon={message.properties?.resolved ? 'ph--check-circle--regular' : 'ph--circle--regular'}
        iconOnly
        label='Resolve'
        variant='ghost'
        size={3}
      />
    </div>
    {children}
  </Row>
);

/** Transcription: a timestamp and speaker in the gutter, and no separators — it reads as one text. */
const TranscriptChrome = ({ message, children }: MessageChromeProps) => (
  <Row classNames='grid grid-cols-[5rem_1fr] gap-2 py-0.5'>
    <div className='text-xs text-description tabular-nums'>
      {timeOf(message, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </div>
    <div className='min-w-0'>
      <span className='me-2 text-xs font-medium text-description'>{message.sender.name}</span>
      {children}
    </div>
  </Row>
);
