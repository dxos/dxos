//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Doc } from '@dxos/echo-doc';
import { useResolveRef } from '@dxos/echo-react';
import { useTextEditor } from '@dxos/react-ui-editor';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Util from '@dxos/react-ui/Util';
import { type SpecDocument } from '@dxos/types';

import { createMdlExtensions } from './extensions.ts';

export type SpecDocumentEditorProps = {
  document: SpecDocument.SpecDocument;
};

/** A spec's `.mdl` text, live-bound to its ECHO content and highlighted as MDL. */
export const SpecDocumentEditor = Util.composable<HTMLDivElement, SpecDocumentEditorProps>(
  ({ classNames, document, ...props }, forwardedRef) => {
    const themeMode = Hooks.useThemeMode();
    // The live text rather than a snapshot, so an edit does not rebuild the editor; it initializes once the ref resolves.
    const text = useResolveRef(document.content);
    const { parentRef } = useTextEditor(() => {
      if (!text) {
        return {};
      }

      return {
        initialValue: text.content ?? '',
        extensions: createMdlExtensions({
          themeMode,
          lineWrapping: true,
          data: { id: document.id, text: Doc.createAccessor(text, ['content']) },
        }),
      };
    }, [themeMode, document, text]);

    return (
      <div
        {...Util.composableProps(props, { classNames: ['dx-expand', classNames] })}
        ref={Hooks.composeRefs(parentRef, forwardedRef)}
      />
    );
  },
);
