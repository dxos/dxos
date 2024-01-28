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
  toggleBold,
  toggleItalic,
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

      case 'bold':
        toggleBold(view);
        break;
      case 'italic':
        toggleItalic(view);
        break;
      case 'strikethrough':
        toggleStrikethrough(view);
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

    // TODO(burdon): Hack since otherwise focus doesn't leave heading selector.
    // TODO(burdon): Set selection after rendered.
    setTimeout(() => {
      view.focus();
    });
  };
};
