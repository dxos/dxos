//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { IconButton, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

import { type SuggestionGroup } from '../../hooks';

export type SuggestionCardProps = {
  group: SuggestionGroup;
  /** Human-readable author label (resolved from the DID); defaults to the raw author id. */
  authorLabel?: string;
  current?: boolean;
  onAccept?: (group: SuggestionGroup) => void;
  onReject?: (group: SuggestionGroup) => void;
  onSelect?: (group: SuggestionGroup) => void;
};

/**
 * A single reviewable suggestion, rendered as an anchored card: author (colour-coded), the
 * before→after change, and Accept/Reject controls. Accept merges the change into the base document;
 * Reject drops it from the author's branch. The card is attributed by {@link SuggestionGroup.colour}
 * to match the author's overlay colour.
 */
export const SuggestionCard = ({ group, authorLabel, current, onAccept, onReject, onSelect }: SuggestionCardProps) => {
  const { t } = useTranslation(meta.profile.key);
  return (
    <div
      role='group'
      data-testid='suggestion-card'
      data-author={group.author}
      className={`flex flex-col gap-2 pli-3 plb-2 border-be border-separator cursor-pointer ${
        current ? 'bg-activeSurface' : ''
      }`}
      onClick={() => onSelect?.(group)}
    >
      <div className='flex items-center gap-2'>
        <span role='presentation' className='w-2 h-2 rounded-full shrink-0' style={{ backgroundColor: group.colour }} />
        <span className='text-sm font-medium truncate' style={{ color: group.colour }}>
          {authorLabel ?? group.author}
        </span>
        <div className='grow' />
        <IconButton
          iconOnly
          variant='ghost'
          size={4}
          icon='ph--check--regular'
          label={t('accept-change.label')}
          data-testid='suggestion-accept'
          onClick={(event) => {
            event.stopPropagation();
            onAccept?.(group);
          }}
        />
        <IconButton
          iconOnly
          variant='ghost'
          size={4}
          icon='ph--x--regular'
          label={t('reject-change.label')}
          data-testid='suggestion-reject'
          onClick={(event) => {
            event.stopPropagation();
            onReject?.(group);
          }}
        />
      </div>
      <div className='text-sm break-words'>
        {group.removed && <span className='line-through text-subdued'>{group.removed}</span>}
        {group.removed && group.inserted && <span> </span>}
        {group.inserted && (
          <span className='border-b-2' style={{ color: group.colour, borderColor: group.colour }}>
            {group.inserted}
          </span>
        )}
      </div>
    </div>
  );
};

SuggestionCard.displayName = 'SuggestionCard';
