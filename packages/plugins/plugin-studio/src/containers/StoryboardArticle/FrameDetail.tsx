//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useObject, useResolveRef } from '@dxos/echo-react';
import { Banner, IconButton, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { type Frame } from '#types';

import { MediaArtifactForm } from '../MediaArtifactArticle/MediaArtifactForm.tsx';

export type FrameDetailProps = {
  frame: Frame.Frame;
  /** The storyboard plank's id; the nested article is attended through it. */
  attendableId?: string;
  /** Attaches a new artifact to a frame that has none. */
  onAddArtifact?: (frame: Frame.Frame) => void;
};

/**
 * The selected frame's compose form — the artifact's `MediaArtifactForm`, whose toolbar reads its
 * contributed actions (Connect) from the artifact's node under the storyboard while attention
 * follows the storyboard plank. The produced variants are the storyboard's main pane, not the
 * companion's.
 */
export const FrameDetail = ({ frame, attendableId, onAddArtifact }: FrameDetailProps) => {
  const { t } = useTranslation(meta.profile.key);
  // The snapshot re-renders this on frame changes; the ref is read live so the resolved artifact is
  // the live object — the surface filter checks the subject's type, which a snapshot fails.
  const [snapshot] = useObject(frame);
  const artifact = useResolveRef(snapshot ? frame.artifact : undefined);
  if (!artifact) {
    return (
      <Banner.Empty
        classNames='h-full'
        label={
          <span className='flex flex-col items-center gap-2'>
            {t('frame-empty.message')}
            {onAddArtifact && (
              <IconButton
                icon='ph--plus--regular'
                label={t('add-frame-artifact.label')}
                onClick={() => onAddArtifact(frame)}
              />
            )}
          </span>
        }
      />
    );
  }

  return (
    <MediaArtifactForm
      artifact={artifact}
      attendableId={attendableId}
      nodeId={attendableId ? `${attendableId}/${artifact.id}` : undefined}
    />
  );
};

FrameDetail.displayName = 'FrameDetail';
