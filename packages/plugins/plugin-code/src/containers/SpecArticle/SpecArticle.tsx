//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useMemo } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { mdl, mdlBlockDescription } from '@dxos/deus/extension';
import { createDocAccessor } from '@dxos/echo-client';
import { getSpace, useObject } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Panel, useThemeContext } from '@dxos/react-ui';
import { Editor } from '@dxos/react-ui-editor';
import {
  createBasicExtensions,
  createDataExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  documentSlots,
  editorClassNames,
} from '@dxos/ui-editor';
import { isTruthy } from '@dxos/util';

import { Spec } from '#types';

export type SpecArticleProps = AppSurface.ObjectArticleProps<Spec.Spec> & {
  /** Render the editor in read-only mode (no toolbar, no edits). */
  readOnly?: boolean;
};

/**
 * Renders a Spec ECHO object using react-ui-editor's compound primitives with
 * the .mdl CodeMirror extensions. Live-edits the bound `spec.content`. Used
 * directly when a bare Spec is opened.
 */
export const SpecArticle = forwardRef<HTMLDivElement, SpecArticleProps>(
  ({ role, subject: spec, attendableId, readOnly = false }, forwardedRef) => {
    const { themeMode } = useThemeContext();
    const identity = useIdentity();
    const space = getSpace(spec);

    // Trigger re-render when the content ref resolves.
    useObject(spec.content);
    const target = spec.content.target;

    const extensions = useMemo(
      () =>
        [
          createBasicExtensions({ lineNumbers: true, readOnly }),
          createMarkdownExtensions({ codeLanguages: [mdlBlockDescription] }),
          createThemeExtensions({ themeMode, slots: documentSlots }),
          decorateMarkdown(),
          mdl(),
          target &&
            createDataExtensions({
              id: spec.id,
              text: createDocAccessor(target, ['content']),
              messenger: space,
              identity,
            }),
        ].filter(isTruthy),
      [identity, space, spec.id, target, themeMode, readOnly],
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
            <Editor.View classNames={editorClassNames(role)} />
          </Panel.Content>
        </Panel.Root>
      </Editor.Root>
    );
  },
);

SpecArticle.displayName = 'SpecArticle';
