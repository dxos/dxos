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
import { chatRegistry } from './widgets';

/**
 * The five places in the repo that render a thread of messages, approximated against one engine.
 *
 * The point is not the fixtures — it is that all five differ only in the renderer, the chrome and a
 * couple of options, while the list, the virtualization, the selection and the search are the same
 * code. Where a scenario needs something the engine does not have, that is the finding.
 */
export type FeedScenario = 'assistant' | 'email' | 'thread' | 'comments' | 'transcript';

export type ScenarioDefinition = {
  messages: Message.Message[];
  renderer: MessageRenderer;
  /** Widgets for the tags the renderer emits; only the assistant turn has non-prose blocks. */
  registry?: XmlWidgetRegistry;
  Chrome: ComponentType<MessageChromeProps>;
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
      blocks.push({ _tag: 'toolCall', toolCallId, name: 'search', input: '{}', providerExecuted: false });
      blocks.push({
        _tag: 'toolResult',
        toolCallId,
        name: 'search',
        result: random.lorem.paragraph(),
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

//
// Chrome
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
const AssistantChrome = ({ message, index, selected, children }: MessageChromeProps) => {
  const prompt = message.sender.role === 'user';

  return (
    <Row classNames={mx(selected && 'bg-hover-surface')}>
      {prompt ? (
        <div className='min-w-0'>
          {/* The reader's own words, framed: a prompt is an instruction the thread can be rewound
              to, and it reads as one only if it is visibly not the model's prose. */}
          <div className='ps-2 pe-2 pt-1 pb-1 border-s-2 border-accent-bg rounded-sm bg-input-surface'>{children}</div>
          {/* Revealed on hover, but never removed from flow: chrome that appears and disappears
              changes the row's height, and a pointer travelling down a scrolling list would then
              move every row below it. Opacity costs nothing to measure. */}
          <div className='flex items-center gap-1 pt-1 text-xs text-description opacity-0 transition-opacity group-hover:opacity-100'>
            <IconButton icon='ph--arrow-counter-clockwise--regular' iconOnly label='Rewind' variant='ghost' size={3} />
            <IconButton icon='ph--git-branch--regular' iconOnly label='Fork' variant='ghost' size={3} />
            <span>{timeOf(message)}</span>
            <span className='text-subdued'>#{index}</span>
          </div>
        </div>
      ) : (
        <div className='min-w-0'>
          {children}
          <div className='flex items-center gap-2 pt-1 text-xs text-description opacity-0 transition-opacity group-hover:opacity-100'>
            <span className='font-medium'>{message.sender.name}</span>
            <span>{timeOf(message)}</span>
            <span className='text-subdued'>#{index}</span>
            <span className='grow' />
            <IconButton icon='ph--arrow-bend-up-left--regular' iconOnly label='Reply' variant='ghost' size={3} />
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
