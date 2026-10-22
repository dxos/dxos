//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useRef } from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Tag from '@dxos/react-ui/Tag';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';
import { type SourceKey, parseSourceKey } from '#sync';

import { type ReviewModel, STATUS_STYLE, VERDICT_STATUSES, summarizeReview } from '../SpecModel/index.ts';

export type ReviewPanelProps = {
  review?: ReviewModel;
  /** Where the review was looked for, shown when there is none yet. */
  reviewKey?: string;
  selected?: string;
  /** A verdict's id: reveal the item in the spec. */
  onSelect?: (id: string) => void;
  /** An evidence key: open the code. */
  onOpen?: (key: SourceKey) => void;
};

/** The latest compliance review of a spec: counts per status, then every verdict, worst first, with its evidence. */
export const ReviewPanel = ({ review, reviewKey, selected, onSelect, onOpen }: ReviewPanelProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const selectedRef = useRef<HTMLDivElement>(null);
  useEffect(() => selectedRef.current?.scrollIntoView({ block: 'nearest' }), [selected]);

  if (!review) {
    return (
      <Layout.Flex column gap='sm' classNames='p-4 text-description' data-testid='review-panel.empty'>
        <span>{t('review-panel.empty.label')}</span>
        {reviewKey && <code className='text-xs'>{reviewKey}</code>}
      </Layout.Flex>
    );
  }

  const verdicts = [...review.verdicts].sort(
    (a, b) => VERDICT_STATUSES.indexOf(b.status) - VERDICT_STATUSES.indexOf(a.status),
  );

  return (
    <ScrollArea.Root orientation='vertical' data-testid='review-panel'>
      <ScrollArea.Viewport>
        <Layout.Flex column gap='sm' classNames='p-3'>
          <Layout.Flex wrap gap='xs' classNames='items-center text-xs text-description'>
            {review.by && <span>{review.by}</span>}
            {review.date && <span>· {review.date}</span>}
            {review.commit && <code>· {review.commit.slice(0, 10)}</code>}
          </Layout.Flex>
          <Layout.Flex wrap gap='xs'>
            {summarizeReview(review).map(({ status, count }) => (
              <Tag.Tag key={status} hue={STATUS_STYLE[status].hue} data-testid={`review-panel.count.${status}`}>
                <Icon.Icon icon={STATUS_STYLE[status].icon} size='xs' />
                {count} {STATUS_STYLE[status].label}
              </Tag.Tag>
            ))}
          </Layout.Flex>
          {verdicts.map((verdict) => (
            <div
              key={verdict.id}
              ref={verdict.id === selected ? selectedRef : undefined}
              className={mx(
                'flex flex-col gap-1 p-2 rounded-sm border border-separator',
                verdict.id === selected && 'ring-2 ring-accent-focus-indicator',
              )}
              data-testid='review-panel.verdict'
              data-verdict={verdict.id}
              data-status={verdict.status}
            >
              <Layout.Flex gap='xs' classNames='items-center'>
                <Tag.Tag hue={STATUS_STYLE[verdict.status].hue}>{STATUS_STYLE[verdict.status].label}</Tag.Tag>
                <button
                  type='button'
                  className='font-mono text-sm hover:underline whitespace-nowrap shrink-0'
                  onClick={() => onSelect?.(verdict.id)}
                >
                  {verdict.id}
                </button>
                {verdict.summary && <span className='text-sm truncate'>{verdict.summary}</span>}
              </Layout.Flex>
              {verdict.note && <p className='text-sm text-description'>{verdict.note}</p>}
              {verdict.evidence.map((raw) => {
                const key = parseSourceKey(raw);
                return (
                  <button
                    key={raw}
                    type='button'
                    disabled={!key}
                    className='text-start font-mono text-xs text-accent-text hover:underline truncate'
                    title={raw}
                    onClick={() => key && onOpen?.(key)}
                  >
                    {key ? `${key.path.split('/').pop()}${key.fragment ? `#${key.fragment}` : ''}` : raw}
                  </button>
                );
              })}
            </div>
          ))}
        </Layout.Flex>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};
