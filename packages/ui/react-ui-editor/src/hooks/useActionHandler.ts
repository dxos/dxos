//
// Copyright 2024 DXOS.org
//

import type { EditorView } from '@codemirror/view';

import type { ToolbarProps } from '../components';
import {
  createComment,
  insertTable,
  setHeading,
  setStyle,
  toggleStyle,
  addLink,
  removeLink,
  Inline,
  List,
  addList,
  removeList,
  toggleList,
  addBlockquote,
  removeBlockquote,
  addCodeblock,
  removeCodeblock,
  toggleBlockquote,
} from '../extensions';

export const useActionHandler = (view?: EditorView | null): ToolbarProps['onAction'] => {
  return (action) => {
    if (!view) {
      return;
    }

    let inlineType, listType;
    switch (action.type) {
      case 'heading':
        setHeading(parseInt(action.data))(view);
        break;

      case 'strong':
      case 'emphasis':
      case 'strikethrough':
      case 'code':
        inlineType =
          action.type === 'strong'
            ? Inline.Strong
            : action.type === 'emphasis'
              ? Inline.Emphasis
              : action.type === 'strikethrough'
                ? Inline.Strikethrough
                : Inline.Code;
        (typeof action.data === 'boolean' ? setStyle(inlineType, action.data) : toggleStyle(inlineType))(view);
        break;

      case 'list-ordered':
      case 'list-bullet':
      case 'list-tasks':
        listType =
          action.type === 'list-ordered' ? List.Ordered : action.type === 'list-bullet' ? List.Bullet : List.Task;
        (action.data === false
          ? removeList(listType)
          : action.data === true
            ? addList(listType)
            : toggleList(listType))(view);
        break;

      case 'blockquote':
        (action.data === false ? removeBlockquote : action.data === true ? addBlockquote : toggleBlockquote)(view);
        break;
      case 'codeblock':
        (action.data === false ? removeCodeblock : addCodeblock)(view);
        break;
      case 'table':
        insertTable(view);
        break;

      case 'link':
        (action.data === false ? removeLink : addLink)(view);
        break;

      case 'comment':
        createComment(view);
        break;
    }

    // TODO(burdon): Hack otherwise remains on heading selector.
    setTimeout(() => {
      if (!view.hasFocus) {
        view.focus();
      }
    });
  };
};
