//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { useAtomCapability } from '@dxos/app-framework/ui';
import { AppSurface, useAppGraph } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { useActions } from '@dxos/plugin-graph/hooks';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as IllustratorCapabilities from '@dxos/plugin-illustrator/IllustratorCapabilities';
import { Flex, Panel } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { isTauri } from '@dxos/util';

import { CanvasComponent } from '#components';
import { TldrawCapabilities } from '#types';

export type TldrawArticleProps = IllustratorCapabilities.DrawingVariantSurfaceProps;

export const TldrawArticle = ({
  role,
  attendableId,
  drawing,
  canvas,
  extrinsic,
  selection,
  onSelectionChange,
  onActivate,
}: TldrawArticleProps) => {
  invariant(Obj.instanceOf(Drawing.Canvas, canvas));
  const settings = useAtomCapability(TldrawCapabilities.Settings);
  const id = Obj.getURI(drawing as Obj.Any);
  const { hasAttention } = useAttention(attendableId);
  const section = role === AppSurface.Section.role;

  const props = {
    readonly: role === AppSurface.Slide.role,
    autoCenter: section ? true : undefined,
  };

  // TODO(wittjosiah): Genericize tldraw toolbar actions w/ graph.
  const { graph } = useAppGraph();
  const actions = useActions(graph, id);
  const handleThreadCreate = actions.find((action) => action.id === `${id}/comment`)?.data;

  const content = (
    <CanvasComponent
      // Force instance per canvas object. Otherwise, sketches share the same instance.
      key={id}
      classNames='dx-attention-surface'
      canvas={canvas}
      settings={settings}
      // Section embeds render read-only (no controls/grid) until focused, on every platform; the
      // isTauri allowance (always-on UI) applies only to the full article/slide roles.
      // TODO(wittjosiah): Ensure attention works as expected on the mobile app.
      hideUi={section ? !hasAttention : !hasAttention && !isTauri()}
      onThreadCreate={handleThreadCreate}
      selection={selection}
      onSelectionChange={onSelectionChange}
      onActivate={onActivate}
      {...props}
    />
  );

  // An extrinsically-sized embed fills its (possibly non-square) box; otherwise it falls back to a
  // square so the intrinsic embed has a sensible height.
  return section ? <Container fill={extrinsic}>{content}</Container> : <Article>{content}</Article>;
};

const Article = composable<HTMLDivElement, PropsWithChildren>((props, forwardedRef) => (
  <Panel.Root {...composableProps(props, { classNames: 'aspect-square' })} ref={forwardedRef}>
    <Panel.Content>{props.children}</Panel.Content>
  </Panel.Root>
));

const Container = composable<HTMLDivElement, PropsWithChildren<{ fill?: boolean }>>(
  ({ fill, ...props }, forwardedRef) => (
    <Flex
      {...composableProps(props, { classNames: [fill ? 'dx-fill' : 'aspect-square', 'overflow-hidden'] })}
      ref={forwardedRef}
    >
      {props.children}
    </Flex>
  ),
);

TldrawArticle.displayName = 'TldrawArticle';
