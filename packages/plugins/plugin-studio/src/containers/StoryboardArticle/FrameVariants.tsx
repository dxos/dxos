//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { useObject, useResolveRef } from '@dxos/echo-react';
import { Panel, useTranslation } from '@dxos/react-ui';
import { Empty } from '@dxos/react-ui-list';
import { ActionToolbar } from '@dxos/react-ui-menu';

import { meta } from '#meta';
import { type Frame } from '#types';

import { MediaArtifactVariants } from '../MediaArtifactArticle/MediaArtifactVariants.tsx';

export type FrameVariantsProps = PropsWithChildren<{
  frame: Frame.Frame;
  attendableId?: string;
}>;

/** The selected frame's produced variants — the storyboard's main pane; `children` end its toolbar. */
export const FrameVariants = ({ children, frame, attendableId }: FrameVariantsProps) => {
  const { t } = useTranslation(meta.profile.key);
  // The snapshot re-renders this on frame changes; the ref is read live so the artifact is the live object.
  const [snapshot] = useObject(frame);
  const artifact = useResolveRef(snapshot ? frame.artifact : undefined);
  if (!artifact) {
    return (
      <Panel.Root>
        <Panel.Toolbar asChild>
          <ActionToolbar attendableId={attendableId}>{children}</ActionToolbar>
        </Panel.Toolbar>
        <Panel.Content>
          <Empty classNames='h-full' label={t('frame-empty.message')} />
        </Panel.Content>
      </Panel.Root>
    );
  }

  return (
    <MediaArtifactVariants artifact={artifact} attendableId={attendableId}>
      {children}
    </MediaArtifactVariants>
  );
};

FrameVariants.displayName = 'FrameVariants';
