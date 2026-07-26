//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Button, Icon, Tag, useTranslation } from '@dxos/react-ui';
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
        <Button
          key={author}
          density='sm'
          variant='ghost'
          classNames='flex items-center gap-1 pli-1'
          aria-pressed={!hidden}
          aria-label={t(hidden ? 'show-author-suggestions.label' : 'hide-author-suggestions.label', { author: label })}
          data-testid='suggestion-author-toggle'
          onClick={() => onToggle(author)}
        >
          <Tag hue={hue}>{label}</Tag>
          <Icon icon={hidden ? 'ph--eye-slash--regular' : 'ph--eye--regular'} size={4} />
        </Button>
      ))}
    </div>
  );
};

SuggestionAuthors.displayName = 'SuggestionAuthors';
