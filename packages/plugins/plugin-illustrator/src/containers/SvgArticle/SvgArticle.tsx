//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { SvgHandler } from '@dxos/diagram';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { invariant } from '@dxos/invariant';
import * as Panel from '@dxos/react-ui/Panel';

import { SceneSvg } from '#components';
import { Drawing, type IllustratorCapabilities } from '#types';

import { SvgCursors } from './SvgCursors.tsx';

export type SvgArticleProps = IllustratorCapabilities.DrawingVariantSurfaceProps;

/**
 * Article/section surface for the SVG variant: derives the scene from the canvas records (reactively),
 * renders it read-only through {@link SceneSvg}, and shows collaborators' pointers over it.
 */
export const SvgArticle = (props: SvgArticleProps) => <SvgSurface {...props} cursors />;

/** Card surface for the SVG variant: the diagram alone. */
export const SvgCard = (props: SvgArticleProps) => <SvgSurface {...props} />;

const SvgSurface = ({
  canvas,
  selection,
  onSelectionChange,
  onActivate,
  cursors,
}: SvgArticleProps & { cursors?: boolean }) => {
  invariant(Obj.instanceOf(Drawing.Canvas, canvas));
  const [snapshot] = useObject(canvas);
  const objects = useMemo(() => SvgHandler.read(snapshot?.content ?? {}).scene.objects, [snapshot]);

  return (
    <Panel.Root>
      <Panel.Body classNames='dx-attention-surface relative' data-testid='illustrator.svg'>
        <SceneSvg
          objects={objects}
          selection={selection}
          onSelectionChange={onSelectionChange}
          onActivate={onActivate}
        />
        {cursors && <SvgCursors object={canvas} scene={objects} />}
      </Panel.Body>
    </Panel.Root>
  );
};
