//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useMemo } from 'react';

import { mdl, mdlBlockDescription } from '@dxos/deus/extension';
import { Panel, useThemeContext } from '@dxos/react-ui';
import { Editor } from '@dxos/react-ui-editor';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  documentSlots,
  editorClassNames,
} from '@dxos/ui-editor';

export type SpecViewProps = {
  /** Raw MDL content to render. */
  content: string;
  /** Render the editor in read-only mode (no toolbar, no edits). Defaults to true. */
  readOnly?: boolean;
  /** Surface role forwarded to Panel/Editor. */
  role?: string;
  /** Attendable id forwarded to the editor toolbar. */
  attendableId?: string;
};

/**
 * Renders MDL content from a plain string — no ECHO binding required. Used by
 * surfaces that want to preview a bundled spec (e.g. plugin-registry's plugin
 * detail view) without materializing it as an ECHO `Spec` object first.
 */
export const SpecView = forwardRef<HTMLDivElement, SpecViewProps>(
  ({ content, readOnly = true, role, attendableId }, forwardedRef) => {
    const { themeMode } = useThemeContext();

    const extensions = useMemo(
      () => [
        createBasicExtensions({ lineNumbers: true, readOnly }),
        createMarkdownExtensions({ codeLanguages: [mdlBlockDescription] }),
        createThemeExtensions({ themeMode, slots: documentSlots }),
        decorateMarkdown(),
        mdl(),
      ],
      [readOnly, themeMode],
    );

    return (
      <Editor.Root extensions={extensions}>
        <Panel.Root role={role} ref={forwardedRef}>
          {!readOnly && (
            <Panel.Toolbar classNames='bg-toolbar-surface'>
              <Editor.Toolbar role={role} attendableId={attendableId} />
            </Panel.Toolbar>
          )}
          <Panel.Content>
            <Editor.View classNames={editorClassNames(role)} value={content} />
          </Panel.Content>
        </Panel.Root>
      </Editor.Root>
    );
  },
);

SpecView.displayName = 'SpecView';
