//
// Copyright 2026 DXOS.org
//

import React, { Fragment } from 'react';

import * as Accordion from '@dxos/react-ui/Accordion';
import { Tag } from '@dxos/react-ui/Tag';
import * as Typography from '@dxos/react-ui/Typography';

import { type BoardData, type Detail, type Section, type Span, STATES } from './types.ts';

const EMPTY: Record<Section['kind'], string> = {
  questions: 'No questions now.',
  goals: 'No goals yet.',
  prs: 'No pull requests yet.',
  list: 'Nothing here now.',
};

const Spans = ({ spans }: { spans: Span[] }) => (
  <>
    {spans.map((span, index) => {
      const text = span.code ? <code className='font-mono text-[0.92em]'>{span.text}</code> : span.text;
      const content = span.strong ? <strong>{text}</strong> : text;
      return span.href ? (
        // A link inside an accordion trigger must not also toggle the item.
        <Typography.Link key={index} href={span.href} onClick={(event) => event.stopPropagation()}>
          {content}
        </Typography.Link>
      ) : (
        <Fragment key={index}>{content}</Fragment>
      );
    })}
  </>
);

const Details = ({ details }: { details: Detail[] }) => (
  <ul className='list-disc ps-5 space-y-1'>
    {details.map((detail, index) => (
      <li key={index}>
        <Spans spans={detail.spans} />
        {detail.children && <Details details={detail.children} />}
      </li>
    ))}
  </ul>
);

/** "2/5 done" for a section whose states can close, from the states marked `closed`. */
const tally = (section: Section): string | undefined => {
  const states = STATES[section.kind];
  const stated = section.items.filter((item) => item.state);
  if (stated.length === 0) {
    return undefined;
  }
  if (section.kind === 'questions') {
    const open = stated.filter((item) => !states[item.state ?? '']?.closed).length;
    return open > 0 ? `${open} open` : undefined;
  }
  const closed = stated.filter((item) => states[item.state ?? '']?.closed).length;
  return `${closed}/${stated.length}`;
};

const BoardSection = ({ section }: { section: Section }) => {
  const states = STATES[section.kind];
  const count = tally(section);
  return (
    <section className='flex flex-col gap-2' data-testid={`section-${section.id}`}>
      <div className='flex items-baseline gap-2'>
        <h2 className='text-base font-medium'>{section.title}</h2>
        {count && <span className='text-sm text-description'>{count}</span>}
      </div>
      {section.items.length === 0 ? (
        <Typography.Text tone='muted'>{EMPTY[section.kind]}</Typography.Text>
      ) : (
        <Accordion.Root>
          {section.items.map((item, index) => {
            const style = item.state ? states[item.state] : undefined;
            return (
              <Accordion.Item key={index} value={String(index)} disabled={item.details.length === 0}>
                <Accordion.ItemTrigger>
                  <span className='flex items-baseline gap-2'>
                    {item.state && (
                      <Tag hue={style?.hue ?? 'neutral'} classNames='shrink-0'>
                        {item.state}
                      </Tag>
                    )}
                    <span>
                      <Spans spans={item.spans} />
                    </span>
                  </span>
                </Accordion.ItemTrigger>
                {item.details.length > 0 && (
                  <Accordion.ItemContent>
                    <div className='px-3 pb-2 text-sm'>
                      <Details details={item.details} />
                    </div>
                  </Accordion.ItemContent>
                )}
              </Accordion.Item>
            );
          })}
        </Accordion.Root>
      )}
    </section>
  );
};

const formatTime = (iso: string) => `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;

export type BoardProps = { board: BoardData };

/** The session board: a terse header, then each section's items, each one line that opens to its details. */
export const Board = ({ board }: BoardProps) => (
  <main className='mx-auto flex max-w-3xl flex-col gap-6 py-6'>
    <header className='flex flex-col gap-1'>
      <h1 className='text-xl font-semibold'>{board.title}</h1>
      {board.summary && (
        <Typography.Text>
          <Spans spans={board.summary} />
        </Typography.Text>
      )}
      <Typography.Text tone='muted' classNames='text-sm'>
        Updated {formatTime(board.updated)}
        {board.branch && (
          <>
            {' · '}
            <code className='font-mono'>{board.branch}</code>
          </>
        )}
      </Typography.Text>
    </header>
    {board.sections.map((section) => (
      <BoardSection key={section.id} section={section} />
    ))}
  </main>
);
