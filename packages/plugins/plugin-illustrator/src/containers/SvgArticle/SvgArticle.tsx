//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { SvgHandler } from '@dxos/diagram';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { invariant } from '@dxos/invariant';
import { Next } from '@dxos/react-ui/next';

import { SceneSvg } from '#components';
import { Drawing, type IllustratorCapabilities } from '#types';

export type SvgArticleProps = IllustratorCapabilities.DrawingVariantSurfaceProps;

/**
 * Article/section/card surface for the SVG variant: derives the scene from the canvas records
 * (reactively) and renders it read-only through {@link SceneSvg}.
 */
export const SvgArticle = ({ canvas, selection, onSelectionChange, onActivate }: SvgArticleProps) => {
  invariant(Obj.instanceOf(Drawing.Canvas, canvas));
  const [snapshot] = useObject(canvas);
  const objects = useMemo(() => SvgHandler.read(snapshot?.content ?? {}).scene.objects, [snapshot]);

  return (
    <Next.Panel.Root classNames='dx-fill'>
      <Next.Panel.Body classNames='dx-attention-surface'>
        <SceneSvg
          objects={objects}
          selection={selection}
          onSelectionChange={onSelectionChange}
          onActivate={onActivate}
        />
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};
