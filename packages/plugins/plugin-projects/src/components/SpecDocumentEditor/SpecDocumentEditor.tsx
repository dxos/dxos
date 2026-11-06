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

import { useCaretIdentity } from '../../hooks/index.ts';
import { createMdlExtensions } from './extensions.ts';

const SPEC_DOCUMENT_EDITOR_NAME = 'SpecDocumentEditor';

export type SpecDocumentEditorProps = {
  spec: Spec.Spec;
  /** Added after the MDL ones, such as {@link featureEmbeds}; their React widgets render here. */
  extensions?: Extension[];
};

/**
 * A spec's `.mdl` text, live-bound to its ECHO content and highlighted as MDL. Renders inside an `Editor.Root`, so an
 * `Editor.Toolbar` beside it edits this text.
 */
export const SpecDocumentEditor = Util.composable<HTMLDivElement, SpecDocumentEditorProps>(
  ({ classNames, spec, extensions, ...props }, forwardedRef) => {
    const themeMode = Hooks.useThemeMode();
    const registry = useContext(RegistryContext);
    const { setController, state } = useEditorContext(SPEC_DOCUMENT_EDITOR_NAME);
    const [widgets, setWidgets] = useState<WidgetState[]>([]);
    // The live text rather than a snapshot, so an edit does not rebuild the editor; it initializes once the ref resolves.
    const text = useResolveRef(spec.content);
    const identity = useCaretIdentity();
    const space = getSpace(spec);
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
            data: {
              id: Obj.getURI(spec),
              text: Doc.createAccessor(text, ['content']),
              messenger: space,
              identity,
            },
          }),
          formattingListener((formatting: EditorToolbarState) =>
            registry.set(state, { ...registry.get(state), ...formatting }),
          ),
          widgetHost({ setWidgets }),
          extensions ?? [],
        ],
      };
    }, [themeMode, spec, text, extensions, registry, state, space, identity]);

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
