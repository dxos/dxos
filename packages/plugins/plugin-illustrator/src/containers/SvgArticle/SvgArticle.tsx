//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { invariant } from '@dxos/invariant';
import { Panel } from '@dxos/react-ui';

import { SceneSvg } from '#components';
import { SvgHandler } from '#model';
import { Drawing, type IllustratorCapabilities } from '#types';

export type SvgArticleProps = IllustratorCapabilities.DrawingVariantSurfaceProps;

/**
 * Article/section/card surface for the SVG variant: derives the scene from the canvas records
 * (reactively) and renders it read-only through {@link SceneSvg}.
 */
export const SvgArticle = ({ canvas }: SvgArticleProps) => {
  invariant(Obj.instanceOf(Drawing.Canvas, canvas));
  const [snapshot] = useObject(canvas);
  const objects = useMemo(() => SvgHandler.read(snapshot?.content ?? {}).scene.objects, [snapshot]);

  return (
    <Panel.Root classNames='w-full h-full'>
      <Panel.Content asChild>
        <SceneSvg classNames='dx-attention-surface w-full h-full' objects={objects} />
      </Panel.Content>
    </Panel.Root>
  );
};
