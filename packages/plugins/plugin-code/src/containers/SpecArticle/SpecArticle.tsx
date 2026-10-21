//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useMemo, useState } from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { mdl, mdlBlockDescription } from '@dxos/deus/extension';
import { Doc } from '@dxos/echo-doc';
import { useObject } from '@dxos/echo-react';
import { useIdentity } from '@dxos/halo-react';
import { getSpace } from '@dxos/react-client/echo';
import { Editor } from '@dxos/react-ui-editor';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import { Spec } from '@dxos/types';
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

import { ChangelogGraph, type DecisionModel, buildChangelogGraph, decisionGutter } from '#components';

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
    const themeMode = Hooks.useThemeMode();
    const identity = useIdentity();
    const space = spec ? getSpace(spec) : undefined;

    // Trigger re-render when the bound content ref resolves (no-op when there is no spec).
    const [snapshot] = useObject(spec?.content);
    const target = spec?.content.target;
    const text = (spec ? snapshot?.content : content) ?? '';

    // Keyed on the changelog alone, so typing in the spec body does not rebuild the editor's extensions.
    const changelog = text.slice(Math.max(0, text.search(/^## Changelog/m)));
    const decisions = useMemo(
      () => buildChangelogGraph(changelog).nodes.filter((node): node is DecisionModel => node.kind === 'decision'),
      [changelog],
    );
    const [selected, setSelected] = useState<string>();

    const extensions = useMemo(
      () =>
        [
          createBasicExtensions({ lineNumbers: true, readOnly }),
          createMarkdownExtensions({ codeLanguages: [mdlBlockDescription] }),
          createThemeExtensions({ themeMode, slots: documentSlots }),
          decorateMarkdown(),
          mdl(),
          decisions.length > 0 && decisionGutter(decisions, setSelected),
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
      [identity, space, spec?.id, target, themeMode, readOnly, decisions],
    );

    return (
      <Editor.Root extensions={extensions}>
        <Panel.Root role={role} ref={forwardedRef}>
          {!readOnly && (
            <Panel.Header>
              <Editor.Toolbar role={role} attendableId={attendableId} />
            </Panel.Header>
          )}
          <Panel.Body>
            {decisions.length > 0 ? (
              <Layout.Grid cols={['fill', 'fill']} grow classNames='divide-x divide-separator'>
                {/* Scrolls the editor, which sizes to its content. */}
                <div className='relative overflow-auto' data-testid='spec-article.spec'>
                  <Editor.View classNames={editorClassNames(role)} value={spec ? undefined : content} />
                </div>
                <ChangelogGraph content={changelog} selected={selected} />
              </Layout.Grid>
            ) : (
              <Editor.View classNames={editorClassNames(role)} value={spec ? undefined : content} />
            )}
          </Panel.Body>
        </Panel.Root>
      </Editor.Root>
    );
  },
);

SpecArticle.displayName = 'SpecArticle';
