//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useObject, useResolveRef } from '@dxos/echo-react';
import { useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { type Frame } from '#types';

import { MediaArtifactVariants } from '../MediaArtifactArticle/MediaArtifactVariants.tsx';
import { EmptyPanel } from './EmptyPanel.tsx';

export type FrameVariantsProps = {
  frame: Frame.Frame;
  attendableId?: string;
};

/**
 * The selected frame's produced variants — the storyboard's main pane; the storyboard node's
 * toolbar actions (Play) end its toolbar.
 */
export const FrameVariants = ({ frame, attendableId }: FrameVariantsProps) => {
  const { t } = useTranslation(meta.profile.key);
  // The snapshot re-renders this on frame changes; the ref is read live so the artifact is the live object.
  const [snapshot] = useObject(frame);
  const artifact = useResolveRef(snapshot ? frame.artifact : undefined);
  if (!artifact) {
    return <EmptyPanel label={t('frame-empty.message')} attendableId={attendableId} />;
  }

  return <MediaArtifactVariants artifact={artifact} attendableId={attendableId} actionsNodeId={attendableId} />;
};

FrameVariants.displayName = 'FrameVariants';
