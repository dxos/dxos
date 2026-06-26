//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useMemo } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { mdl, mdlBlockDescription } from '@dxos/deus/extension';
import { Doc } from '@dxos/echo-doc';
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

export type SpecArticleProps = Omit<AppSurface.ObjectArticleProps<Spec.Spec>, 'subject'> & {
  /** ECHO Spec to live-edit; omit to render a static `content` string (e.g. a bundled plugin spec). */
  subject?: Spec.Spec;
  /** Static MDL content, rendered read-only when no `subject` is provided. */
  content?: string;
  /** Force read-only mode. Defaults to read-only for static content and editable when editing a Spec. */
  readOnly?: boolean;
};

/**
 * Renders MDL with react-ui-editor's compound primitives and the .mdl CodeMirror extensions.
 * With a `subject` it live-edits the bound ECHO `spec.content` (collaborative); without one it
 * renders the static `content` string read-only (e.g. a bundled plugin spec, no ECHO binding).
 */
export const SpecArticle = forwardRef<HTMLDivElement, SpecArticleProps>(
  ({ role, subject: spec, content, attendableId, readOnly = spec == null }, forwardedRef) => {
    const { themeMode } = useThemeContext();
    const identity = useIdentity();
    const space = spec ? getSpace(spec) : undefined;

    // Trigger re-render when the bound content ref resolves (no-op when there is no spec).
    useObject(spec?.content);
    const target = spec?.content.target;

    const extensions = useMemo(
      () =>
        [
          createBasicExtensions({ lineNumbers: true, readOnly }),
          createMarkdownExtensions({ codeLanguages: [mdlBlockDescription] }),
          createThemeExtensions({ themeMode, slots: documentSlots }),
          decorateMarkdown(),
          mdl(),
          // Live two-way binding only when editing an ECHO Spec; static content is rendered via `value`.
          spec &&
            target &&
            createDataExtensions({
              id: spec.id,
              text: Doc.createAccessor(target, ['content']),
              messenger: space,
              identity,
            }),
        ].filter(isTruthy),
      [identity, space, spec?.id, target, themeMode, readOnly],
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
            <Editor.View classNames={editorClassNames(role)} value={spec ? undefined : content} />
          </Panel.Content>
        </Panel.Root>
      </Editor.Root>
    );
  },
);

SpecArticle.displayName = 'SpecArticle';
