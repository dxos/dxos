//
// Copyright 2026 DXOS.org
//

import React, { createContext, forwardRef, useCallback, useContext, useMemo, useState } from 'react';

import {
  type ReviewModel,
  type SourceKey,
  type Verdict,
  VERDICT_STATUSES,
  type VerdictStatus,
  summarizeReview,
} from '@dxos/deus/review';
import { MarkdownView } from '@dxos/react-ui-markdown';
import { Mosaic, type MosaicTileProps, useMosaicContainer } from '@dxos/react-ui-mosaic';
import * as Collapsible from '@dxos/react-ui/Collapsible';
import * as Focus from '@dxos/react-ui/Focus';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Select from '@dxos/react-ui/Select';
import * as Status from '@dxos/react-ui/Status';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';
import * as Tooltip from '@dxos/react-ui/Tooltip';

import { CodeNamespace } from '../../namespace.ts';
import { type SourceReader } from '../SpecEditor/snippet-card.ts';
import { STATUS_STYLE } from '../SpecModel/index.ts';
import { VerdictCard } from '../VerdictCard/index.ts';

/** One of a spec's reviews, as the panel's picker lists it. */
export type ReviewOption = { id: string; label: string };

/** The picker's value for each item's newest verdict across the reviews. */
const CURRENT = 'current';

/** The status filter's value for every verdict. */
const ALL = 'all';

export type ReviewPanelProps = {
  review?: ReviewModel;
  /** The spec's reviews, newest first; the picker shows the current status or one of them. */
  history?: readonly ReviewOption[];
  /** The review shown; undefined shows the current status. */
  selectedReview?: string;
  onSelectReview?: (id: string | undefined) => void;
  /** Where the review was looked for, shown when there is none yet. */
  reviewKey?: string;
  /** The current verdict; kept in step with the item selected in the spec. */
  selected?: string;
  /** A verdict became current, or its menu asked to show the item: reveal it in the spec. */
  onSelect?: (id: string) => void;
  onOpenCode?: (key: SourceKey) => void;
  /** The checkout's text of a file, for the current verdict's walkthrough. */
  read?: SourceReader;
};

/** Mosaic tiles get only their item, so the panel's handlers reach them through context. */
const ReviewPanelContext = createContext<Pick<ReviewPanelProps, 'onSelect' | 'onOpenCode' | 'read'>>({});

/**
 * A spec's compliance review: a picker of its reviews, then the review's summary (its lead paragraph, the rest behind a
 * disclosure), a status filter with each status's count, and every verdict, worst first, as a list of cards. The current
 * status takes each item's verdict from the newest review that judges it. The summary, filter and cards scroll together
 * under the picker; the list is the shared card container: arrow keys move the current card, and the current card
 * follows the spec.
 */
export const ReviewPanel = ({
  review,
  history = [],
  selectedReview,
  onSelectReview,
  reviewKey,
  selected,
  onSelect,
  onOpenCode,
  read,
}: ReviewPanelProps) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  const [filter, setFilter] = useState<VerdictStatus | typeof ALL>(ALL);
  // Worst first, like the cards.
  const counts = useMemo(() => (review ? summarizeReview(review).reverse() : []), [review]);
  // A status the shown review lacks filters nothing, so switching reviews never leaves an empty list.
  const status = counts.some(({ status }) => status === filter) ? filter : ALL;
  const verdicts = useMemo(
    () =>
      (review?.verdicts ?? [])
        .filter((verdict) => status === ALL || verdict.status === status)
        .sort((a, b) => VERDICT_STATUSES.indexOf(b.status) - VERDICT_STATUSES.indexOf(a.status)),
    [review, status],
  );
  const [lead, rest] = useMemo(() => splitLead(review?.summary), [review]);
  const handlers = useMemo(() => ({ onSelect, onOpenCode, read }), [onSelect, onOpenCode, read]);
  const handleCurrentChange = useCallback((id: string | undefined) => id && onSelect?.(id), [onSelect]);

  if (!review) {
    return (
      <Status.Empty icon='ph--seal-check--regular' classNames='dx-fill' data-testid='review-panel.empty'>
        {t('review-panel.empty.label')}
        {reviewKey && <code className='block text-xs'>{reviewKey}</code>}
      </Status.Empty>
    );
  }

  return (
    <ReviewPanelContext.Provider value={handlers}>
      <Layout.Flex column classNames='h-full min-h-0' data-testid='review-panel'>
        {history.length > 0 && onSelectReview && (
          <div className='px-2 pt-2'>
            <Select.Root
              value={[selectedReview ?? CURRENT]}
              onValueChange={({ value: [value] }) => onSelectReview(value === CURRENT ? undefined : value)}
              items={[{ value: CURRENT, label: t('review-panel.current.label') }, ...history.map(toItem)]}
            >
              <Select.Trigger classNames='w-full' data-testid='review-panel.picker' />
              <Select.Content>
                <Select.Item item={{ value: CURRENT, label: t('review-panel.current.label') }} />
                {history.map((option) => (
                  <Select.Item key={option.id} item={toItem(option)} />
                ))}
              </Select.Content>
            </Select.Root>
          </div>
        )}
        {/* The current status mixes reviews, so each card names its own; one review is named here. */}
        {(selectedReview !== undefined || history.length === 0) && (
          <p className='px-2 pt-1 text-xs text-description' data-testid='review-panel.meta'>
            {[review.by, review.date, review.commit?.slice(0, 10)].filter(Boolean).join(' · ')}
          </p>
        )}
        <ScrollArea.Root orientation='vertical' classNames='grow'>
          {/* No top padding, so the pinned filter meets the top edge with no gap for the cards to show through. */}
          <ScrollArea.Viewport classNames='px-2 pb-2'>
            {lead && (
              <div className='py-2 text-sm text-description' data-testid='review-panel.summary'>
                <MarkdownView content={lead} />
                {rest && (
                  <Collapsible.Root>
                    <Collapsible.Trigger data-testid='review-panel.summary.more'>
                      {t('review-panel.summary.more.label')}
                    </Collapsible.Trigger>
                    <Collapsible.Content>
                      <MarkdownView content={rest} />
                    </Collapsible.Content>
                  </Collapsible.Root>
                )}
              </div>
            )}
            {/* Pinned above the cards it filters while the list scrolls under it. */}
            <ToggleGroup.Root
              type='single'
              value={status}
              onValueChange={(value) => setFilter((value || ALL) as VerdictStatus | typeof ALL)}
              aria-label={t('review-panel.filter.label')}
              classNames='sticky top-0 z-[1] w-full py-1 bg-base-surface flex-wrap'
              data-testid='review-panel.filter'
            >
              <ToggleGroup.Item value={ALL} variant='ghost' compact data-testid='review-panel.count.all'>
                {t('review-panel.filter.all.label', { count: review.verdicts.length })}
              </ToggleGroup.Item>
              {counts.map(({ status, count }) => (
                <Tooltip.Root key={status}>
                  <Tooltip.Trigger asChild>
                    <ToggleGroup.Item
                      value={status}
                      variant='ghost'
                      compact
                      icon={STATUS_STYLE[status].icon}
                      iconClassNames={STATUS_STYLE[status].text}
                      data-testid={`review-panel.count.${status}`}
                    >
                      {count}
                      <span className='sr-only'>{STATUS_STYLE[status].label}</span>
                    </ToggleGroup.Item>
                  </Tooltip.Trigger>
                  <Tooltip.Content>{STATUS_STYLE[status].label}</Tooltip.Content>
                </Tooltip.Root>
              ))}
            </ToggleGroup.Root>
            <Focus.Group asChild>
              <Mosaic.Container asChild currentId={selected} onCurrentChange={handleCurrentChange}>
                <div className='pt-1'>
                  {/* The stack spaces the cards, so each card keeps its own frame. */}
                  <Mosaic.Stack
                    classNames='gap-2'
                    Tile={VerdictTile}
                    items={verdicts}
                    getId={(verdict: Verdict) => verdict.id}
                    draggable={false}
                  />
                </div>
              </Mosaic.Container>
            </Focus.Group>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Layout.Flex>
    </ReviewPanelContext.Provider>
  );
};

/** A summary's first paragraph and the rest, split at the first blank line. */
const splitLead = (summary: string | undefined): [string | undefined, string | undefined] => {
  const text = summary?.trim();
  if (!text) {
    return [undefined, undefined];
  }
  const index = text.search(/\n\s*\n/);
  return index < 0 ? [text, undefined] : [text.slice(0, index), text.slice(index).trim()];
};

const toItem = ({ id, label }: ReviewOption) => ({ value: id, label });

type VerdictTileProps = Pick<MosaicTileProps<Verdict>, 'location' | 'data' | 'current'>;

const VerdictTile = forwardRef<HTMLDivElement, VerdictTileProps>(({ data, location, current }, forwardedRef) => {
  const { onSelect, onOpenCode, read } = useContext(ReviewPanelContext);
  const { setCurrentId } = useMosaicContainer('VerdictTile');
  const handleCurrentChange = useCallback(() => setCurrentId(data.id), [data.id, setCurrentId]);
  return (
    <Mosaic.Tile
      asChild
      classNames='dx-hover dx-current dx-selected'
      id={data.id}
      data={data}
      location={location}
      current={current}
    >
      <Focus.Item asChild current={current} onCurrentChange={handleCurrentChange}>
        <VerdictCard
          verdict={data}
          current={current}
          read={read}
          onReveal={onSelect}
          onOpenCode={onOpenCode}
          ref={forwardedRef}
        />
      </Focus.Item>
    </Mosaic.Tile>
  );
});

VerdictTile.displayName = 'VerdictTile';
