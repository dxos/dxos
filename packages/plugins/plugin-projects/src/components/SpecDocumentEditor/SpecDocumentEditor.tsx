//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { RegistryContext } from '@effect/atom-react/RegistryContext';
import React, { Suspense, useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import type * as Spec from '@dxos/compute/Spec';
import { Obj } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';
import { useResolveRef } from '@dxos/echo-react';
import { getSpace } from '@dxos/react-client/echo';
import {
  type EditorToolbarState,
  createEditorController,
  useEditorContext,
  useTextEditor,
} from '@dxos/react-ui-editor';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Util from '@dxos/react-ui/Util';
import { type WidgetState, formattingListener, widgetHost } from '@dxos/ui-editor';
import { type EditorViewMode } from '@dxos/ui-editor/types';

import { useCaretIdentity, useSpecBlockForms } from '../../hooks/index.ts';
import { createMdlExtensions } from './extensions.ts';

const SPEC_DOCUMENT_EDITOR_NAME = 'SpecDocumentEditor';

export type SpecDocumentEditorProps = {
  spec: Spec.Spec;
  /** Added after the MDL ones, such as {@link featureEmbeds}; their React widgets render here. */
  extensions?: Extension[];
  /** Added to the field editors of the block cards, bound to the spec's text through their fields. */
  fieldExtensions?: Extension[];
  /** `preview` draws each block as a form over its kind's schema, `readonly` as one that does not edit, `source` as text. */
  viewMode?: EditorViewMode;
};

/**
 * A spec's `.mdl` text, live-bound to its ECHO content and highlighted as MDL, its blocks drawn as forms outside the
 * `source` view. Renders inside an `Editor.Root`, so an `Editor.Toolbar` beside it edits this text.
 */
export const SpecDocumentEditor = Util.composable<HTMLDivElement, SpecDocumentEditorProps>(
  ({ classNames, spec, extensions, fieldExtensions, viewMode = 'preview', ...props }, forwardedRef) => {
    const themeMode = Hooks.useThemeMode();
    const registry = useContext(RegistryContext);
    const { setController, state } = useEditorContext(SPEC_DOCUMENT_EDITOR_NAME);
    const [widgets, setWidgets] = useState<WidgetState[]>([]);
    // The live text rather than a snapshot, so an edit does not rebuild the editor; it initializes once the ref resolves.
    const text = useResolveRef(spec.content);
    const identity = useCaretIdentity();
    const space = getSpace(spec);
    const forms = useSpecBlockForms(spec, { viewMode, fieldExtensions });
    const { parentRef, view } = useTextEditor(() => {
      if (!text) {
        return {};
      }

      return {
        initialValue: text.content ?? '',
        extensions: [
          createMdlExtensions({
            themeMode,
            lineWrapping: true,
            readOnly: viewMode === 'readonly',
            data: {
              id: Obj.getURI(spec),
              text: Doc.createAccessor(text, ['content']),
              messenger: space,
              identity,
              wrapAwareness: forms.wrapAwareness,
            },
          }),
          forms.extension,
          formattingListener((formatting: EditorToolbarState) =>
            registry.set(state, { ...registry.get(state), ...formatting }),
          ),
          widgetHost({ setWidgets }),
          extensions ?? [],
        ],
      };
    }, [themeMode, spec, text, extensions, registry, state, space, identity, viewMode, forms]);

    useEffect(() => setController(createEditorController(view)), [view, setController]);

    return (
      <div
        {...Util.composableProps(props, { classNames: ['dx-expand', classNames] })}
        ref={Hooks.composeRefs(parentRef, forwardedRef)}
      >
        {/* Portals add no DOM here, so they share the element CodeMirror owns. */}
        {widgets.map(({ id, root, Component, props }) =>
          createPortal(
            <Suspense fallback={null}>
              <Component {...props} />
            </Suspense>,
            root,
            id,
          ),
        )}
      </div>
    );
  },
);
