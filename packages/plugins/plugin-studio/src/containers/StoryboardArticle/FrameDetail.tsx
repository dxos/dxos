//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { useObject, useResolveRef } from '@dxos/echo-react';
import { IconButton, useTranslation } from '@dxos/react-ui';
import { Empty } from '@dxos/react-ui-list';

import { meta } from '#meta';
import { type Frame } from '#types';

export type FrameDetailProps = {
  frame: Frame.Frame;
  /** The storyboard plank's id; the nested article is attended through it. */
  attendableId?: string;
  /** Attaches a new artifact to a frame that has none. */
  onAddArtifact?: (frame: Frame.Frame) => void;
};

/**
 * The selected frame's artifact through the article surface — the same `MediaArtifactArticle` the
 * artifact has on its own. The artifact's toolbar reads its contributed actions (Connect) from the
 * artifact's node under the storyboard, while attention follows the storyboard plank.
 */
export const FrameDetail = ({ frame, attendableId, onAddArtifact }: FrameDetailProps) => {
  const { t } = useTranslation(meta.profile.key);
  // The snapshot re-renders this on frame changes; the ref is read live so the resolved artifact is
  // the live object — the surface filter checks the subject's type, which a snapshot fails.
  const [snapshot] = useObject(frame);
  const artifact = useResolveRef(snapshot ? frame.artifact : undefined);

  if (!artifact) {
    return (
      <Empty
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
    <Surface.Surface
      type={AppSurface.Article}
      data={{
        subject: artifact,
        attendableId,
        nodeId: attendableId ? `${attendableId}/${artifact.id}` : undefined,
      }}
      limit={1}
    />
  );
};

FrameDetail.displayName = 'FrameDetail';
