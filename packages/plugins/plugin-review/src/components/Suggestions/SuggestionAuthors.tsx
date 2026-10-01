//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';
import { type Hue } from '@dxos/ui-theme';

import { meta } from '#meta';

export type SuggestionAuthorRow = {
  /** The author's identity DID. */
  author: string;
  /** Display name; falls back to the DID upstream. */
  label: string;
  /** The author's palette hue — matches their avatar/tag and inline markers. */
  hue: Hue;
  hidden: boolean;
};

export type SuggestionAuthorsProps = {
  authors: SuggestionAuthorRow[];
  /** Toggle one author's suggestion visibility (session-local view filter). */
  onToggle: (author: string) => void;
};

/**
 * Per-author visibility toggles for the review companion: one chip per suggesting author, coloured
 * with the author's hue. Toggling filters that author's suggestions out of every review surface
 * (overlay, change bars, cards) for this user only — the branches themselves are untouched.
 */
export const SuggestionAuthors = ({ authors, onToggle }: SuggestionAuthorsProps) => {
  const { t } = useTranslation(meta.profile.key);
  if (authors.length === 0) {
    return null;
  }

  return (
    <div role='group' aria-label={t('suggestion-authors.label')} className='flex flex-wrap gap-1 p-2'>
      {authors.map(({ author, label, hue, hidden }) => (
        // The tag is the toggle (a clickable Tag is a button), the eye inside the pill.
        <Next.Tag
          key={author}
          hue={hue}
          classNames={['gap-1', hidden && 'opacity-50']}
          aria-pressed={!hidden}
          aria-label={t(hidden ? 'show-author-suggestions.label' : 'hide-author-suggestions.label', {
            author: label,
          })}
          data-testid='suggestion-author-toggle'
          onClick={() => onToggle(author)}
        >
          {label}
          <Next.Icon icon={hidden ? 'ph--eye-slash--regular' : 'ph--eye--regular'} size='xs' />
        </Next.Tag>
      ))}
    </div>
  );
};

SuggestionAuthors.displayName = 'SuggestionAuthors';
