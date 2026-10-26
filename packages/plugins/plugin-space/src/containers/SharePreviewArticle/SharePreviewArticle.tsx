//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';

import { getSharePreviewHeading, sharePreviewKeyOfNode, sharePreviewsAtom } from '../../util/index.ts';

export type SharePreviewArticleProps = AppSurface.PendingArticleData;

/**
 * Stands in for a shared object's plank while its space is joined: the object as EDGE read it, read-only, until the
 * plank's node resolves and the article replaces it. Renders nothing for any other pending plank.
 */
export const SharePreviewArticle = ({ attendableId, nodeId }: SharePreviewArticleProps) => {
  const previews = useAtomValue(sharePreviewsAtom);
  const types = Hooks.useCapabilities(AppCapabilities.Schema);
  const key = sharePreviewKeyOfNode(nodeId);
  const preview = key ? previews[key] : undefined;
  const data = useMemo<AppSurface.ObjectPreviewData | undefined>(
    () => preview && { attendableId, subject: preview.subject },
    [attendableId, preview],
  );
  const heading = useMemo(() => preview && getSharePreviewHeading(preview.subject, types.flat()), [preview, types]);
  AppSurface.usePendingHeading(heading);
  return data ? <Surface.Surface type={AppSurface.ObjectPreview} data={data} limit={1} /> : null;
};

SharePreviewArticle.displayName = 'SharePreviewArticle';
