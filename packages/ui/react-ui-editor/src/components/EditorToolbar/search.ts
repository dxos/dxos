//
// Copyright 2025 DXOS.org
//

import { openSearchPanel } from '@codemirror/search';
import { type EditorView } from '@codemirror/view';

import { type ActionGroupBuilderFn } from '@dxos/react-ui-menu';

import { translationKey } from '../../translations';

/** Add search action to the builder. */
export const addSearch =
  (getView: () => EditorView): ActionGroupBuilderFn =>
  (builder) => {
    builder.action(
      'search',
      {
        label: ['search.label', { ns: translationKey }],
        testId: 'editor.toolbar.search',
        icon: 'ph--magnifying-glass--regular',
      },
      () => openSearchPanel(getView()),
    );
  };
