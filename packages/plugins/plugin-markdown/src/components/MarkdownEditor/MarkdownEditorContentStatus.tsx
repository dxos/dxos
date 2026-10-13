//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import React, { useEffect, useMemo, useState } from 'react';

import { Obj, type Ref } from '@dxos/echo';
import { useResolveRef } from '@dxos/echo-react';
import { log } from '@dxos/log';
import * as Banner from '@dxos/react-ui/Banner';
import * as Hooks from '@dxos/react-ui/Hooks';
import { type Text } from '@dxos/schema';

import { meta } from '#meta';

/** Why a document's editor has no content binding (and so is not editable). */
export type ContentStatus = 'loading' | 'missing' | 'deleted';

// Most content resolves within a frame or two; the notice only appears for a load that lingers.
const LOADING_NOTICE_DELAY = 1_000;

const notDeleted = Atom.make(() => false);

/**
 * The state of a document's content ref while its target is unavailable: still loading, not found
 * locally, or deleted. `undefined` once the target resolves (or when there is no ref).
 */
export const useContentStatus = (contentRef: Ref.Ref<Text.Text> | undefined): ContentStatus | undefined => {
  const target = useResolveRef(contentRef);

  // Derived to a boolean so a live target's edits do not re-render the caller.
  const deletedAtom = useMemo(
    () =>
      contentRef
        ? Atom.make((get) => {
            const snapshot = get(Obj.atom(contentRef, { deleted: 'include' }));
            return snapshot !== undefined && Obj.isDeleted(snapshot);
          })
        : notDeleted,
    [contentRef],
  );
  const deleted = useAtomValue(deletedAtom);

  const [missing, setMissing] = useState(false);
  useEffect(() => {
    setMissing(false);
    if (!contentRef || target) {
      return;
    }

    let cancelled = false;
    contentRef
      .tryLoad({ deleted: 'include' })
      .then((loaded) => {
        if (!cancelled && loaded === undefined) {
          setMissing(true);
        }
      })
      .catch((error) => log.catch(error));
    return () => {
      cancelled = true;
    };
  }, [contentRef, target]);

  if (!contentRef || target) {
    return undefined;
  }

  return deleted ? 'deleted' : missing ? 'missing' : 'loading';
};

export type MarkdownEditorContentStatusProps = {
  status: ContentStatus | undefined;
};

/**
 * Explains why the editor below cannot be focused: without a content binding it is not editable.
 */
export const MarkdownEditorContentStatus = ({ status }: MarkdownEditorContentStatusProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const [showLoading, setShowLoading] = useState(false);
  useEffect(() => {
    setShowLoading(false);
    if (status !== 'loading') {
      return;
    }

    const timeout = setTimeout(() => setShowLoading(true), LOADING_NOTICE_DELAY);
    return () => clearTimeout(timeout);
  }, [status]);

  if (status === undefined || (status === 'loading' && !showLoading)) {
    return null;
  }

  return (
    <Banner.Root valence={status === 'loading' ? 'neutral' : 'warning'} data-testid='markdown.content-status'>
      <Banner.Title>{t(`content-${status}.title`)}</Banner.Title>
      <Banner.Body>{t(`content-${status}.message`)}</Banner.Body>
    </Banner.Root>
  );
};
