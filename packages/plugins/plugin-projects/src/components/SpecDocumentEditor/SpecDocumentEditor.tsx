//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import React, { Suspense, useState } from 'react';
import { createPortal } from 'react-dom';

import { Doc } from '@dxos/echo-doc';
import { useResolveRef } from '@dxos/echo-react';
import { useTextEditor } from '@dxos/react-ui-editor';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Util from '@dxos/react-ui/Util';
import { type SpecDocument } from '@dxos/types';
import { type WidgetState, widgetHost } from '@dxos/ui-editor';

import { createMdlExtensions } from './extensions.ts';

export type SpecDocumentEditorProps = {
  document: SpecDocument.SpecDocument;
  /** Added after the MDL ones, such as {@link featureEmbeds}; their React widgets render here. */
  extensions?: Extension[];
};

/** A spec's `.mdl` text, live-bound to its ECHO content and highlighted as MDL. */
export const SpecDocumentEditor = Util.composable<HTMLDivElement, SpecDocumentEditorProps>(
  ({ classNames, document, extensions, ...props }, forwardedRef) => {
    const themeMode = Hooks.useThemeMode();
    const [widgets, setWidgets] = useState<WidgetState[]>([]);
    // The live text rather than a snapshot, so an edit does not rebuild the editor; it initializes once the ref resolves.
    const text = useResolveRef(document.content);
    const { parentRef } = useTextEditor(() => {
      if (!text) {
        return {};
      }

      return {
        initialValue: text.content ?? '',
        extensions: [
          createMdlExtensions({
            themeMode,
            lineWrapping: true,
            data: { id: document.id, text: Doc.createAccessor(text, ['content']) },
          }),
          widgetHost({ setWidgets }),
          extensions ?? [],
        ],
      };
    }, [themeMode, document, text, extensions]);

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
