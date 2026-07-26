//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Icon, Tag, useTranslation } from '@dxos/react-ui';
import { type Hue } from '@dxos/ui-theme';

import { meta } from '../../meta';

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
        // The tag IS the toggle: no outer button chrome, the eye renders inside the dx-tag.
        <Tag key={author} asChild hue={hue} classNames={hidden && 'opacity-50'}>
          <button
            type='button'
            aria-pressed={!hidden}
            aria-label={t(hidden ? 'show-author-suggestions.label' : 'hide-author-suggestions.label', {
              author: label,
            })}
            data-testid='suggestion-author-toggle'
            className='inline-flex items-center gap-1 cursor-pointer'
            onClick={() => onToggle(author)}
          >
            {label}
            <Icon icon={hidden ? 'ph--eye-slash--regular' : 'ph--eye--regular'} size={3} />
          </button>
        </Tag>
      ))}
    </div>
  );
};

SuggestionAuthors.displayName = 'SuggestionAuthors';
