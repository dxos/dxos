//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Flex, Panel } from '@dxos/react-ui';
import { useViewState, useViewStateActions } from '@dxos/react-ui-attention';

import { SpacetimeEditor } from '#components';
import { Scene, SceneView } from '#types';

export type SceneArticleProps = AppSurface.ObjectArticleProps<Scene.Scene>;

/** A scene as a full plank (toolbar + canvas) or, in the section role, an inline square canvas. */
export const SceneArticle = ({ subject, attendableId, role }: SceneArticleProps) => {
  // Keyed by the scene, not the plank: the same scene opened anywhere resumes from the same pose.
  const contextId = Obj.getURI(subject);
  const camera = useViewState(SceneView.cameraAspect, contextId);
  const { set: setCamera } = useViewStateActions(SceneView.cameraAspect, contextId);

  // Section embeds (e.g. transcluded in a markdown document) render the scene inline in a constrained
  // box rather than filling the plank; the canvas needs an explicit height to lay out.
  if (role === AppSurface.Section.role) {
    return (
      <SpacetimeEditor.Root scene={subject}>
        <Flex classNames='aspect-square w-full max-h-full min-h-0'>
          <SpacetimeEditor.Canvas classNames='grow' camera={camera} onCameraChange={setCamera} />
        </Flex>
      </SpacetimeEditor.Root>
    );
  }

  return (
    <SpacetimeEditor.Root scene={subject}>
      <Panel.Root>
        <Panel.Toolbar asChild>
          <SpacetimeEditor.Toolbar attendableId={attendableId} alwaysActive />
        </Panel.Toolbar>
        <Panel.Content asChild>
          <SpacetimeEditor.Canvas camera={camera} onCameraChange={setCamera} />
        </Panel.Content>
      </Panel.Root>
    </SpacetimeEditor.Root>
  );
};

SceneArticle.displayName = 'SceneArticle';
