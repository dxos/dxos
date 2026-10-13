//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Banner from '@dxos/react-ui/Banner';
import * as Hooks from '@dxos/react-ui/Hooks';

import { type ContentStatus } from '#hooks';
import { meta } from '#meta';

const messages = {
  missing: { title: 'content-missing.title', message: 'content-missing.message' },
  deleted: { title: 'content-deleted.title', message: 'content-deleted.message' },
} as const;

export type MarkdownEditorContentStatusProps = {
  status: ContentStatus | undefined;
};

/**
 * Explains why the editor below cannot be focused: without a content binding it is not editable.
 * Loading is shown by the editor's placeholder instead.
 */
export const MarkdownEditorContentStatus = ({ status }: MarkdownEditorContentStatusProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  if (status === undefined || status === 'loading') {
    return null;
  }

  return (
    <Banner.Root valence='warning' data-testid='markdown.content-status' data-status={status}>
      <Banner.Title>{t(messages[status].title)}</Banner.Title>
      <Banner.Body>{t(messages[status].message)}</Banner.Body>
    </Banner.Root>
  );
};
