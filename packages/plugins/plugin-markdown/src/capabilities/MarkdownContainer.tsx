//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useCallback } from 'react';

import { useAtomCapability, useCapability } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { useViewState, useViewStateActions } from '@dxos/react-ui-attention';
import { type Text } from '@dxos/schema';
import { type EditorViewMode } from '@dxos/ui-editor/types';

import { MarkdownArticle, type MarkdownArticleProps } from '#containers';
import { Markdown, MarkdownCapabilities } from '#types';

import { editorViewModeAspect } from './editor-view-state.ts';

export type MarkdownContainerProps = AppSurface.ObjectArticleProps<Markdown.Document | Text.Text, { id: string }>;

/**
 * Resolves the editor's ambient state (attention, settings, per-document view mode) for both the
 * document and plain-text surfaces, so neither surface's `props` mapper has to.
 */
export const MarkdownContainer = forwardRef<HTMLDivElement, MarkdownContainerProps>(
  ({ id, attendableId, subject, role }, forwardedRef) => {
    const viewState = useCapability(AttentionCapabilities.ViewState);
    const settings = useAtomCapability(MarkdownCapabilities.Settings);
    const editorState = useCapability(MarkdownCapabilities.EditorState);

    // Per-document view mode is durable UI state (ViewState, keyed by document id); it overrides the
    // `defaultViewMode` setting when the user has picked a mode for this document.
    const perDocumentViewMode = useViewState(editorViewModeAspect, id);
    const { set: setViewMode } = useViewStateActions(editorViewModeAspect, id);
    const viewMode: EditorViewMode = perDocumentViewMode ?? settings?.defaultViewMode ?? 'source';
    const handleViewModeChange = useCallback<NonNullable<MarkdownArticleProps['onViewModeChange']>>(
      (mode) => setViewMode(mode),
      [setViewMode],
    );

    return (
      <MarkdownArticle
        role={role}
        subject={subject}
        id={id}
        attendableId={attendableId}
        settings={settings}
        viewState={viewState}
        editorStateStore={editorState}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        ref={forwardedRef}
      />
    );
  },
);
