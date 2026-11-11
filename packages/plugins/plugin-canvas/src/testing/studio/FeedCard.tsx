//
// Copyright 2026 DXOS.org
//

//
// The deck's `card({ variant: 'compact' })` with a `feedStrip()` (studio `assets/deck/lib/components.mjs`,
// `.d-card.compact` / `.d-feed` in `deck.css`) as a canvas element kind: a Phosphor icon and a title, a row of feed
// blocks with some marked, an optional sentence of body, and a mono footer under a hairline.
//
// Sizes on the Agents slide: 300 × 138 (inbound feeds), 300 × 176 (agents), 300 × 120 (sub-agents). The type sizes
// are slide units, which is what the node's own frame is in, so the card scales with the drawing rather than with
// the page.
//

import * as Schema from 'effect/Schema';
import React from 'react';

import { type ElementKindSpec, type NodeViewProps, TextPart } from '@dxos/react-ui-canvas';
import * as Icon from '@dxos/react-ui/Icon';
import { Scene } from '@dxos/scene';

/** The deck's accent, and the ink outline its agent cards take. */
export const ACCENT = '#2d6fff';
export const INK = '#1e2430';

/** A feed block that is marked, by index, with the tone it takes; the deck keys these as strings, as JSON does. */
const Marks = Schema.Record(Schema.String, Schema.String);

export const feedCardFields = {
  /** The card's title, in the core base's `label`, so it still reads where the kind is unknown. */
  label: Schema.String,
  /** A Phosphor icon name as the deck writes it (`chat-circle-dots`), without the `ph--…--regular` wrapping. */
  icon: Schema.optional(Schema.String.annotate({ title: 'Icon' })),
  /** An accent drawn as the card's outline; `ink` is the agents' dark edge. */
  tone: Schema.optional(Schema.String.annotate({ title: 'Tone' })),
  /** How many blocks the feed strip has. */
  feed: Schema.optional(Schema.Number.annotate({ title: 'Feed blocks' })),
  /** A mono caption to the left of the strip (`feed`, `task`). */
  feedLabel: Schema.optional(Schema.String.annotate({ title: 'Feed label' })),
  /** Which blocks are coloured, by index. */
  marks: Schema.optional(Marks),
  body: Schema.optional(Schema.String.annotate({ title: 'Body' })),
  footer: Schema.optional(Schema.String.annotate({ title: 'Footer' })),
};

export const FeedCardNode = Schema.Struct({
  ...Scene.Element2D.fields,
  type: Schema.Literal('feed-card'),
  ...feedCardFields,
});

type FeedCardFields = Schema.Struct.Type<typeof feedCardFields>;

const isFeedCard = (node: NodeViewProps['node']): node is NodeViewProps['node'] & FeedCardFields =>
  node.type === 'feed-card';

/** The tone a mark or an outline names; anything else is taken as a colour of its own. */
const toneColor = (tone: string | undefined): string | undefined =>
  tone === undefined ? undefined : tone === 'accent' ? ACCENT : tone === 'ink' ? INK : tone;

const FeedStrip = ({ n, label, marks }: { n: number; label?: string; marks?: Record<string, string> }) => (
  <div className='flex items-center shrink-0' style={{ gap: 5 }} data-testid='feed-strip'>
    {label && (
      <span className='font-mono text-description shrink-0' style={{ fontSize: 12, marginInlineEnd: 2 }}>
        {label}
      </span>
    )}
    {Array.from({ length: n }, (_, index) => {
      const mark = toneColor(marks?.[String(index)]);
      return (
        <i
          key={index}
          data-marked={mark ? true : undefined}
          className='block shrink-0 rounded-[3px]'
          // An unmarked block is the deck's inset well: a shade of the surface rather than a colour of its own.
          style={{
            width: 17,
            height: 17,
            background: mark ?? 'rgb(0 0 0 / 0.07)',
            ...(mark ? {} : { boxShadow: 'inset 0 1px 2px rgb(0 0 0 / 0.1)' }),
          }}
        />
      );
    })}
  </div>
);

export const FeedCardNodeView = ({ node, editing }: NodeViewProps) => {
  if (!isFeedCard(node)) {
    return null;
  }
  const outline = toneColor(node.tone);
  return (
    <div
      className='dx-cover flex flex-col rounded-xl bg-baseSurface overflow-hidden'
      data-testid='feed-card-node'
      style={{
        padding: '14px 18px',
        gap: 10,
        boxShadow: outline
          ? `0 1px 2px rgb(0 0 0 / 0.06), 0 6px 16px rgb(0 0 0 / 0.08), inset 0 0 0 2px ${outline}`
          : '0 1px 2px rgb(0 0 0 / 0.06), 0 6px 16px rgb(0 0 0 / 0.08)',
      }}
    >
      <div className='flex items-center shrink-0' style={{ gap: 9 }}>
        <Icon.Icon icon={`ph--${node.icon ?? 'square'}--regular`} size='lg' classNames='shrink-0' />
        <TextPart part='label' text={node.label} editing={editing} classNames='grow truncate text-[23px] leading-none'>
          {node.label}
        </TextPart>
      </div>
      {node.feed ? <FeedStrip n={node.feed} label={node.feedLabel} marks={node.marks} /> : null}
      {node.body ? (
        <div className='text-baseText' style={{ fontSize: 15, lineHeight: 1.3 }}>
          {node.body}
        </div>
      ) : null}
      {node.footer ? (
        <div
          className='mt-auto border-bs border-separator font-mono text-description'
          style={{ paddingBlockStart: 10, fontSize: 14 }}
        >
          {node.footer}
        </div>
      ) : null}
    </div>
  );
};

export const feedCardSpec: ElementKindSpec = {
  name: 'Feed card',
  icon: 'ph--rows--regular',
  key: 'F',
  schema: FeedCardNode,
  component: FeedCardNodeView,
  create: ({ id, z, center, size }) => ({ type: 'feed-card', id, z, center, size, label: 'Feed', feed: 9 }),
  defaultSize: { width: 300, height: 138 },
  resizable: true,
  parts: [{ field: 'label' }],
};
