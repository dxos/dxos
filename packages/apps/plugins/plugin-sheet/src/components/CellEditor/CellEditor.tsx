//
// Copyright 2024 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import React, { type DOMAttributes, useEffect, useState } from 'react';

import { DocAccessor } from '@dxos/client/echo';
import { useThemeContext, useTranslation } from '@dxos/react-ui';
import {
  type UseTextEditorProps,
  createBasicExtensions,
  createThemeExtensions,
  preventNewline,
  useTextEditor,
} from '@dxos/react-ui-editor';

import { sheetExtension, type SheetExtensionOptions } from './extension';
import { SHEET_PLUGIN } from '../../meta';

type AdapterProps = {
  value: string;
  onChange: (value: string) => void;
};

/**
 * Two-way data adapter.
 */
// TODO(burdon): Factor out.
// TODO(burdon): Memorize selection; check keeps state when scrolled off screen.
const useAdapter = ({ value, onChange }: AdapterProps): Extension => {
  const [view, setView] = useState<EditorView>();
  const [extension] = useState<Extension>(
    EditorView.updateListener.of((update) => {
      setView(update.view);
      if (update.docChanged) {
        onChange?.(update.state.doc.toString());
      }
    }),
  );

  // Update state.
  useEffect(() => {
    view?.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
  }, [value]);

  return extension;
};

// TODO(burdon): Use DocAccessor for text cells.
export type CellEditorProps = {
  accessor?: DocAccessor;
} & AdapterProps &
  Pick<SheetExtensionOptions, 'functions'> &
  Pick<UseTextEditorProps, 'autoFocus'> &
  Pick<DOMAttributes<HTMLInputElement>, 'onBlur' | 'onKeyDown'>;

export const CellEditor = ({ accessor, functions, autoFocus, value, onChange, onBlur, onKeyDown }: CellEditorProps) => {
  const { t } = useTranslation(SHEET_PLUGIN);
  const adapter = useAdapter({ value, onChange });
  const { themeMode } = useThemeContext();
  const { parentRef } = useTextEditor(() => {
    return {
      autoFocus,
      doc: value !== undefined ? value : accessor !== undefined ? DocAccessor.getValue(accessor) : '',
      extensions: [
        adapter,
        // accessor ? automerge(accessor) : [],
        EditorView.domEventHandlers({
          keydown: onKeyDown as any,
        }),
        EditorView.focusChangeEffect.of((_, focusing) => {
          if (!focusing) {
            onBlur?.({ type: 'blur' } as any);
          }
          return null;
        }),
        createBasicExtensions({ placeholder: t('cell placeholder') }),
        createThemeExtensions({
          themeMode,
          slots: { content: { className: '!p-1 border border-transparent focus:border-primary-500' } },
        }),
        preventNewline,
        sheetExtension({ functions }),
      ],
    };
  }, [accessor]);

  return <div ref={parentRef} />;
};
