//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { useObject } from '@dxos/echo-react';
import { Panel } from '@dxos/react-ui';

import { type MediaArtifact } from '#types';

import { MediaArtifactForm } from './MediaArtifactForm.tsx';
import { MediaArtifactVariants } from './MediaArtifactVariants.tsx';

export type MediaArtifactArticleProps = AppSurface.ObjectArticleProps<MediaArtifact.MediaArtifact> & {
  /**
   * App-graph node the toolbar's contributed actions (Connect) are read from. Defaults to
   * `attendableId`, which is the plank's node when the article is the plank; an article nested in
   * another (a storyboard frame) is attended through its host but has its own node.
   */
  nodeId?: string;
};

/**
 * Media-agnostic article surface for a {@link MediaArtifact}: the compose form
 * ({@link MediaArtifactForm}) over the produced variants ({@link MediaArtifactVariants}), the lower
 * half appearing once something has been produced. Hosts that want one side alone (a storyboard's
 * frame companion, its player) compose the pieces directly.
 */
export const MediaArtifactArticle = ({
  role,
  subject: artifact,
  attendableId,
  nodeId = attendableId,
}: MediaArtifactArticleProps) => {
  const [snapshot] = useObject(artifact);
  const produced = (snapshot?.variants?.length ?? 0) > 0;

  return (
    <Panel.Root role={role}>
      <Panel.Content classNames={produced ? 'grid grid-rows-[1fr_1fr] gap-2' : 'grid grid-rows-[1fr]'}>
        <MediaArtifactForm artifact={artifact} attendableId={attendableId} nodeId={nodeId} />
        {produced && (
          <MediaArtifactVariants
            classNames='border-t border-subdued-separator'
            artifact={artifact}
            attendableId={attendableId}
          />
        )}
      </Panel.Content>
    </Panel.Root>
  );
};

MediaArtifactArticle.displayName = 'MediaArtifactArticle';
