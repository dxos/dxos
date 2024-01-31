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
  setStyle,
  toggleStyle,
  Inline,
  toggleList,
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
        (typeof action.data === 'boolean' ? setStyle(Inline.Strong, action.data) : toggleStyle(Inline.Strong))(view);
        break;
      case 'emphasis':
        (typeof action.data === 'boolean' ? setStyle(Inline.Emphasis, action.data) : toggleStyle(Inline.Emphasis))(
          view,
        );
        break;
      case 'strikethrough':
        (typeof action.data === 'boolean'
          ? setStyle(Inline.Strikethrough, action.data)
          : toggleStyle(Inline.Strikethrough))(view);
        break;
      case 'code':
        (typeof action.data === 'boolean' ? setStyle(Inline.Code, action.data) : toggleStyle(Inline.Code))(view);
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
