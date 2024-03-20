//
// Copyright 2024 DXOS.org
//

import { type EditorView } from '@codemirror/view';

import {
  Inline,
  List,
  addBlockquote,
  addCodeblock,
  addLink,
  addList,
  insertTable,
  removeBlockquote,
  removeCodeblock,
  removeLink,
  removeList,
  setHeading,
  setStyle,
  toggleBlockquote,
  toggleList,
  toggleStyle,
} from './formatting';
import { createComment } from '../comments';

export type ActionType =
  | 'blockquote'
  | 'strong'
  | 'codeblock'
  | 'comment'
  | 'heading'
  | 'image'
  | 'emphasis'
  | 'code'
  | 'link'
  | 'list-bullet'
  | 'list-ordered'
  | 'list-task'
  | 'mention'
  | 'prompt'
  | 'strikethrough'
  | 'table';

export type Action = {
  type: ActionType;
  data?: any;
};

export type ActionHandler = (view: EditorView, action: Action) => void;

export const processAction: ActionHandler = (view, action) => {
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
    case 'list-task':
      listType =
        action.type === 'list-ordered' ? List.Ordered : action.type === 'list-bullet' ? List.Bullet : List.Task;
      (action.data === false ? removeList(listType) : action.data === true ? addList(listType) : toggleList(listType))(
        view,
      );
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
      (action.data === false ? removeLink : addLink())(view);
      break;

    case 'image':
      addLink({ url: action.data, image: true })(view);
      break;

    case 'comment':
      createComment(view);
      break;
  }

  requestAnimationFrame(() => {
    if (!view.hasFocus) {
      view.focus();
    }
  });
};
