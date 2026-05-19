//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useMemo } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { mdl, mdlBlockDescription } from '@dxos/deus/extension';
import { createDocAccessor } from '@dxos/echo-db';
import { getSpace, useObject } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Panel, useThemeContext } from '@dxos/react-ui';
import { Editor } from '@dxos/react-ui-editor';
import { type Text } from '@dxos/schema';
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
  /** Render the editor in read-only mode. Skips collaborative data extensions. */
  readOnly?: boolean;
};

/**
 * Renders a Spec object using react-ui-editor's compound primitives with the
 * .mdl CodeMirror extensions. Used directly when a bare Spec is opened.
 */
export const SpecArticle = forwardRef<HTMLDivElement, SpecArticleProps>(
  ({ role, subject: spec, attendableId, readOnly }, forwardedRef) => {
    // Trigger re-render when the content ref resolves.
    useObject(spec.content);
    const target = spec.content.target;
    const space = getSpace(spec);

    return (
      <SpecView
        role={role}
        attendableId={attendableId}
        readOnly={readOnly}
        content={target?.content ?? ''}
        target={readOnly ? undefined : target}
        space={space}
        docId={spec.id}
        ref={forwardedRef}
      />
    );
  },
);

export type SpecViewProps = {
  role?: string;
  attendableId?: string;
  /** Initial / current content. Always used as the seed text; when `target` is set, edits flow through createDataExtensions. */
  content: string;
  /** ECHO Text target used for collaborative editing. Omit when rendering static / read-only content. */
  target?: Text.Text;
  /** Space owning the target (for awareness/presence). */
  space?: ReturnType<typeof getSpace>;
  /** Stable id used by createDataExtensions. */
  docId?: string;
  /** Render the editor in read-only mode. */
  readOnly?: boolean;
};

/**
 * Bare MDL editor view. Used by `SpecArticle` for ECHO-backed Spec objects and
 * by surfaces that need to render plain MDL strings (e.g. a plugin's bundled
 * `PLUGIN.mdl` content) in read-only mode.
 */
export const SpecView = forwardRef<HTMLDivElement, SpecViewProps>(
  ({ role, attendableId, content, target, space, docId, readOnly }, forwardedRef) => {
    const { themeMode } = useThemeContext();
    const identity = useIdentity();

    const extensions = useMemo(
      () =>
        [
          createBasicExtensions({ lineNumbers: true, readOnly }),
          createMarkdownExtensions({ codeLanguages: [mdlBlockDescription] }),
          createThemeExtensions({ themeMode, slots: documentSlots }),
          decorateMarkdown(),
          mdl(),
          !readOnly &&
            target &&
            docId &&
            createDataExtensions({
              id: docId,
              text: createDocAccessor(target, ['content']),
              messenger: space,
              identity,
            }),
        ].filter(isTruthy),
      [identity, space, docId, target, themeMode, readOnly],
    );

    return (
      <Editor.Root extensions={extensions}>
        <Panel.Root role={role} ref={forwardedRef}>
          <Panel.Toolbar classNames='bg-toolbar-surface'>
            {/* TODO(burdon): Custom toolbar. */}
            <Editor.Toolbar role={role} attendableId={attendableId} />
          </Panel.Toolbar>
          <Panel.Content>
            <Editor.View classNames={editorClassNames(role)} value={readOnly ? content : undefined} />
          </Panel.Content>
        </Panel.Root>
      </Editor.Root>
    );
  },
);
