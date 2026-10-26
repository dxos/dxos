//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useMemo } from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj } from '@dxos/echo';

import { sharePreviewKeyOfNode, sharePreviewsAtom } from '../../util/index.ts';

export type SharePreviewArticleProps = AppSurface.PendingArticleData;

/**
 * Stands in for a shared object's plank while its space is joined: the object as EDGE read it, read-only, until the
 * plank's node resolves and the article replaces it. Renders nothing for any other pending plank.
 */
export const SharePreviewArticle = ({ attendableId, nodeId }: SharePreviewArticleProps) => {
  const previews = useAtomValue(sharePreviewsAtom);
  const key = sharePreviewKeyOfNode(nodeId);
  const preview = key ? previews[key] : undefined;
  const data = useMemo<AppSurface.ObjectPreviewData | undefined>(
    () => preview && { attendableId, subject: preview.subject },
    [attendableId, preview],
  );
  const label = preview && Obj.getLabel(preview.subject);
  AppSurface.usePendingHeading(preview && label ? { label, icon: Obj.getIcon(preview.subject)?.icon } : undefined);
  return data ? <Surface.Surface type={AppSurface.ObjectPreview} data={data} limit={1} /> : null;
};

SharePreviewArticle.displayName = 'SharePreviewArticle';
