//
// Copyright 2026 DXOS.org
//

import React, { createContext, forwardRef, useCallback, useContext, useMemo } from 'react';

import { Mosaic, type MosaicTileProps, useMosaicContainer } from '@dxos/react-ui-mosaic';
import * as Focus from '@dxos/react-ui/Focus';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Status from '@dxos/react-ui/Status';
import * as Tag from '@dxos/react-ui/Tag';

import { meta } from '#meta';
import { type SourceKey } from '#sync';

import { type SourceReader } from '../SpecEditor/snippet-card.ts';
import { type ReviewModel, STATUS_STYLE, type Verdict, VERDICT_STATUSES, summarizeReview } from '../SpecModel/index.ts';
import { VerdictCard } from '../VerdictCard/index.ts';

export type ReviewPanelProps = {
  review?: ReviewModel;
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
 * The latest compliance review of a spec: counts per status, then every verdict, worst first, as a list of cards.
 * The list is the shared card container: arrow keys move the current card, and the current card follows the spec.
 */
export const ReviewPanel = ({ review, reviewKey, selected, onSelect, onOpenCode, read }: ReviewPanelProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const verdicts = useMemo(
    () =>
      [...(review?.verdicts ?? [])].sort(
        (a, b) => VERDICT_STATUSES.indexOf(b.status) - VERDICT_STATUSES.indexOf(a.status),
      ),
    [review],
  );
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
        <Layout.Flex wrap gap='xs' classNames='p-2 items-center text-xs text-description'>
          {summarizeReview(review).map(({ status, count }) => (
            <Tag.Tag key={status} hue={STATUS_STYLE[status].hue} data-testid={`review-panel.count.${status}`}>
              <Icon.Icon icon={STATUS_STYLE[status].icon} size='xs' />
              {count} {STATUS_STYLE[status].label}
            </Tag.Tag>
          ))}
          <span>{[review.by, review.date, review.commit?.slice(0, 10)].filter(Boolean).join(' · ')}</span>
        </Layout.Flex>
        <Focus.Group asChild>
          <Mosaic.Container asChild currentId={selected} onCurrentChange={handleCurrentChange}>
            <ScrollArea.Root orientation='vertical' classNames='grow'>
              {/* The viewport pads the list and the stack spaces the cards, so each card keeps its own frame. */}
              <ScrollArea.Viewport classNames='p-2'>
                <Mosaic.Stack
                  classNames='gap-2'
                  Tile={VerdictTile}
                  items={verdicts}
                  getId={(verdict: Verdict) => verdict.id}
                  draggable={false}
                />
              </ScrollArea.Viewport>
            </ScrollArea.Root>
          </Mosaic.Container>
        </Focus.Group>
      </Layout.Flex>
    </ReviewPanelContext.Provider>
  );
};

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
