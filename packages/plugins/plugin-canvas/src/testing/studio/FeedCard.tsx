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

import './theme.css';

import * as Schema from 'effect/Schema';
import React, { type CSSProperties } from 'react';

import { type ElementKindSpec, type NodeViewProps, TextPart } from '@dxos/react-ui-canvas';
import * as Icon from '@dxos/react-ui/Icon';
import { Scene } from '@dxos/scene';

/**
 * A tone as a CSS value. The deck's own names resolve to theme tokens (`theme.css`), so they follow the mode;
 * anything else is taken as a colour of its own, which is how a `var(--t-trip)` from a sidecar still works.
 */
/** A style that also sets custom properties, which `CSSProperties` alone does not allow. */
export type Styled = CSSProperties & Record<`--${string}`, string>;

export const toneValue = (tone: string | undefined): string | undefined =>
  tone === undefined ? undefined : tone === 'accent' ? 'var(--sd-accent)' : tone === 'ink' ? 'var(--sd-fg)' : tone;

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

type FeedStripProps = {
  n: number;
  label?: string;
  marks?: Record<string, string>;
  editing?: NodeViewProps['editing'];
};

const FeedStrip = ({ n, label, marks, editing }: FeedStripProps) => (
  <div className='flex items-center shrink-0' style={{ gap: 5 }} data-testid='feed-strip'>
    {label !== undefined && (
      <TextPart
        part='feedLabel'
        text={label}
        editing={editing}
        classNames='studio-card-label font-mono shrink-0 text-[12px] mie-[2px]'
      >
        {label}
      </TextPart>
    )}
    {Array.from({ length: n }, (_, index) => {
      const mark = toneValue(marks?.[String(index)]);
      const style: Styled = { width: 17, height: 17, ...(mark ? { '--sd-mark': mark } : {}) };
      return (
        <i
          key={index}
          data-marked={mark ? true : undefined}
          className='studio-feed-block block shrink-0 rounded-[3px]'
          style={{ width: 17, height: 17, ...(mark ? { '--sd-mark': mark } : ({} as Styled)) } satisfies Styled}
        />
      );
    })}
  </div>
);

export const FeedCardNodeView = ({ node, editing }: NodeViewProps) => {
  if (!isFeedCard(node)) {
    return null;
  }
  const tone = toneValue(node.tone);
  const style: Styled = { padding: '14px 18px', gap: 10, ...(tone ? { '--sd-tone': tone } : {}) };
  return (
    <div
      className='studio-card dx-cover flex flex-col rounded-xl overflow-hidden'
      data-testid='feed-card-node'
      data-tone={tone ? true : undefined}
      style={style}
    >
      <div className='flex items-center shrink-0' style={{ gap: 9 }}>
        <Icon.Icon icon={`ph--${node.icon ?? 'square'}--regular`} size='lg' classNames='studio-card-icon shrink-0' />
        <TextPart part='label' text={node.label} editing={editing} classNames='grow truncate text-[23px] leading-none'>
          {node.label}
        </TextPart>
      </div>
      {node.feed ? <FeedStrip n={node.feed} label={node.feedLabel} marks={node.marks} editing={editing} /> : null}
      {node.body !== undefined ? (
        <TextPart part='body' text={node.body} editing={editing} classNames='studio-card-body text-[15px] leading-snug'>
          {node.body}
        </TextPart>
      ) : null}
      {node.footer !== undefined ? (
        <TextPart
          part='footer'
          text={node.footer}
          editing={editing}
          classNames='studio-card-footer mt-auto shrink-0 font-mono truncate text-[13px] pbs-2'
        >
          {node.footer}
        </TextPart>
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
  // Composite: every text of the card is edited in place, in reading order. The first is the node's main text, so
  // Enter on a selected card edits its title; Tab moves on through the strip's caption, the body and the footer.
  parts: [{ field: 'label' }, { field: 'feedLabel' }, { field: 'body', multiline: true }, { field: 'footer' }],
};
