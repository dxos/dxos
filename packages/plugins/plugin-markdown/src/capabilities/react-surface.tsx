//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { forwardRef, useCallback, useMemo } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import {
  Surface,
  useAtomCapability,
  useAtomCapabilityState,
  useCapabilities,
  useCapability,
  useSettingsState,
} from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { Text } from '@dxos/schema';
import { type EditorViewMode } from '@dxos/ui-editor/types';
import { Position } from '@dxos/util';

import {
  DocumentHistory,
  EditableMarkdownCard,
  MarkdownArticle,
  type MarkdownArticleProps,
  MarkdownCard,
  MarkdownProperties,
  MarkdownSettings,
} from '#containers';
import { meta } from '#meta';
import { Markdown, MarkdownCapabilities } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed([
    Capability.provide(Capabilities.ReactSurface, [
      Surface.create({
        id: 'surface.document',
        // TODO(wittjosiah): Split into multiple surfaces if this filter proves too strict for non-article roles.
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Markdown.Document, (data) => !data.variant),
          AppSurface.object(AppSurface.Section, Markdown.Document),
          AppSurface.object(AppSurface.Tabpanel, Markdown.Document, (data) => !data.variant),
        ),
        component: ({ data, role, ref }) => {
          return (
            <Container
              id={Obj.getURI(data.subject)}
              attendableId={data.attendableId}
              subject={data.subject}
              role={role}
              ref={ref as React.Ref<HTMLDivElement>}
            />
          );
        },
      }),
      Surface.create({
        id: 'surface.text',
        // TODO(wittjosiah): Split into multiple surfaces if this filter proves too strict for non-article roles.
        // TODO(burdon): Why is attendableId required? See EventArticle.tsx
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Text.Text),
          AppSurface.object(AppSurface.Section, Text.Text),
          AppSurface.object(AppSurface.Tabpanel, Text.Text),
        ),
        component: ({ data, role, ref }) => {
          return (
            <Container
              id={Obj.getURI(data.subject)}
              attendableId={data.attendableId}
              subject={data.subject}
              role={role}
              ref={ref as React.Ref<HTMLDivElement>}
            />
          );
        },
      }),
      Surface.create({
        id: 'companion.documentHistory',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'history'),
          AppSurface.companion(AppSurface.Article, Markdown.Document),
        ),
        component: ({ data, role, ref }) => <DocumentHistory role={role} subject={data.companionTo} ref={ref} />,
      }),
      Surface.create({
        id: 'surface.objectProperties',
        filter: AppSurface.object(AppSurface.ObjectProperties, Markdown.Document),
        component: ({ data, role }) => <MarkdownProperties role={role} subject={data.subject} />,
      }),
      Surface.create({
        id: 'surface.pluginSettings',
        filter: AppSurface.settings(AppSurface.Article, meta.profile.key),
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<Markdown.Settings>(subject.atom);
          return <MarkdownSettings settings={settings} onSettingsChange={updateSettings} />;
        },
      }),
      Surface.create({
        id: 'surface.editable',
        position: Position.first,
        filter: AppSurface.object(
          AppSurface.CardContent,
          [Markdown.Document, Text.Text],
          (data) => data.editable === true,
        ),
        component: ({ data }) => <EditableMarkdownCard subject={data.subject} />,
      }),
      Surface.create({
        id: 'surface.preview',
        filter: AppSurface.object(
          AppSurface.CardContent,
          [Markdown.Document, Text.Text],
          (data) => data.editable !== true,
        ),
        component: ({ data }) => <MarkdownCard {...data} />,
      }),
    ]),
  ]),
);

/**
 * Common wrapper.
 */
const Container = forwardRef<
  HTMLDivElement,
  AppSurface.ObjectArticleProps<Markdown.Document | Text.Text, { id: string }>
>(({ id, attendableId, subject, role }, forwardedRef) => {
  const viewState = useCapability(AttentionCapabilities.ViewState);
  const settings = useAtomCapability(MarkdownCapabilities.Settings);
  const [state, setState] = useAtomCapabilityState(MarkdownCapabilities.State);
  const editorState = useCapability(MarkdownCapabilities.EditorState);
  const extensions = useCapabilities(MarkdownCapabilities.ExtensionProvider);
  const extensionProviders = useMemo(() => extensions.flat(), [extensions]);

  const viewMode: EditorViewMode = (id && state.viewMode[id]) || settings?.defaultViewMode || 'source';
  const handleViewModeChange = useCallback<NonNullable<MarkdownArticleProps['onViewModeChange']>>(
    (mode) => setState((current) => ({ ...current, viewMode: { ...current.viewMode, [id]: mode } })),
    [id, setState],
  );

  return (
    <MarkdownArticle
      role={role}
      subject={subject}
      id={id}
      attendableId={attendableId}
      settings={settings}
      viewState={viewState}
      extensionProviders={extensionProviders}
      editorStateStore={editorState}
      viewMode={viewMode}
      onViewModeChange={handleViewModeChange}
      ref={forwardedRef}
    />
  );
});
