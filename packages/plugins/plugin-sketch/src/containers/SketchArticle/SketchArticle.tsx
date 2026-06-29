//
// Copyright 2024 DXOS.org
//

import React, { PropsWithChildren } from 'react';

import { AppSurface, useAppGraph } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { useActions } from '@dxos/plugin-graph';
import { Flex, Panel } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { isTauri } from '@dxos/util';

import { SketchComponent } from '#components';
import { type Settings, type Sketch } from '#types';

export type SketchArticleProps = AppSurface.ObjectArticleProps<
  Sketch.Sketch,
  {
    settings: Settings.Settings;
  }
>;

export const SketchArticle = ({ role, attendableId, subject: sketch, settings }: SketchArticleProps) => {
  const id = Obj.getURI(sketch);
  const { hasAttention } = useAttention(attendableId);
  const section = role === AppSurface.Section.role;

  const props = {
    readonly: role === AppSurface.Slide.role,
    autoZoom: section ? true : undefined,
    maxZoom: role === AppSurface.Slide.role ? 1.5 : undefined,
  };

  // TODO(wittjosiah): Genericize tldraw toolbar actions w/ graph.
  const { graph } = useAppGraph();
  const actions = useActions(graph, id);
  const handleThreadCreate = actions.find((action) => action.id === `${id}/comment`)?.data;

  const Comp = section ? Container : Article;

  return (
    <Comp>
      <SketchComponent
        // Force instance per sketch object. Otherwise, sketch shares the same instance.
        key={id}
        classNames='dx-attention-surface'
        sketch={sketch}
        settings={settings}
        // Section embeds render read-only (no controls/grid) until focused, on every platform; the
        // isTauri allowance (always-on UI) applies only to the full article/slide roles.
        // TODO(wittjosiah): Ensure attention works as expected on the mobile app.
        hideUi={section ? !hasAttention : !hasAttention && !isTauri()}
        onThreadCreate={handleThreadCreate}
        {...props}
      />
    </Comp>
  );
};

const Article = composable<HTMLDivElement, PropsWithChildren>((props, forwardRef) => (
  <Panel.Root {...composableProps(props, { classNames: 'aspect-square' })} ref={forwardRef}>
    <Panel.Content>{props.children}</Panel.Content>
  </Panel.Root>
));

const Container = composable<HTMLDivElement, PropsWithChildren>((props, forwardRef) => (
  <Flex {...composableProps(props, { classNames: 'aspect-square overflow-hidden' })} ref={forwardRef}>
    {props.children}
  </Flex>
));
