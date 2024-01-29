//
// Copyright 2024 DXOS.org
//

import type { EditorView } from '@codemirror/view';

import type { ToolbarProps } from '../components';
import {
  createComment,
  insertCodeblock,
  insertTable,
  setHeading,
  toggleStrong,
  toggleEmphasis,
  toggleInlineCode,
  toggleList,
  toggleStrikethrough,
} from '../extensions';

export const useActionHandler = (view?: EditorView | null): ToolbarProps['onAction'] => {
  return (action) => {
    if (!view) {
      return;
    }

    switch (action.type) {
      case 'heading':
        setHeading(parseInt(action.data))(view);
        break;

      case 'strong':
        toggleStrong(view);
        break;
      case 'emphasis':
        toggleEmphasis(view);
        break;
      case 'strikethrough':
        toggleStrikethrough(view);
        break;
      case 'code':
        toggleInlineCode(view);
        break;

      case 'list':
        toggleList(view);
        break;

      case 'codeblock':
        insertCodeblock(view);
        break;
      case 'table':
        insertTable(view);
        break;

      case 'comment':
        createComment(view);
        break;
    }

    // TODO(burdon): Hack otherwise remains on heading selector.
    setTimeout(() => {
      view.focus();
      view.dispatch({ selection: view.state.selection });
    });
  };
};
