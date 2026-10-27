//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { RegistryContext } from '@effect/atom-react/RegistryContext';
import React, { useContext, useEffect, useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';

import {
  getSharePreviewHeading,
  retainSharePreview,
  sharePreviewKeyOfNode,
  sharePreviewsAtom,
} from '../../util/index.ts';

export type SharePreviewArticleProps = AppSurface.PendingArticleData;

/**
 * Stands in for a shared object's plank while its space is joined: the object's own article, read-only, over the
 * thin client EDGE serves, until the plank's node resolves and the full client's article replaces it. Renders nothing
 * for any other pending plank.
 */
export const SharePreviewArticle = ({ attendableId, nodeId }: SharePreviewArticleProps) => {
  const registry = useContext(RegistryContext);
  const previews = useAtomValue(sharePreviewsAtom);
  const types = Hooks.useCapabilities(AppCapabilities.Schema);
  const key = sharePreviewKeyOfNode(nodeId);
  const preview = key ? previews[key] : undefined;
  useEffect(() => (key && preview ? retainSharePreview(registry, key) : undefined), [registry, key, preview]);

  const data = useMemo<AppSurface.ArticleData | undefined>(
    () => preview && { attendableId, nodeId, subject: preview.subject, readonly: true },
    [attendableId, nodeId, preview],
  );
  const heading = useMemo(() => preview && getSharePreviewHeading(preview.subject, types.flat()), [preview, types]);
  AppSurface.usePendingHeading(heading);
  // `contents`, so the article lays out in the plank exactly as the full client's article will.
  return data ? (
    <div className='contents' data-testid='space.sharePreview'>
      <Surface.Surface type={AppSurface.Article} data={data} limit={1} />
    </div>
  ) : null;
};

SharePreviewArticle.displayName = 'SharePreviewArticle';
