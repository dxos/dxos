//
// Copyright 2024 DXOS.org
//

import { type EditorView } from '@codemirror/view';

import { type Action } from '@dxos/app-graph';
import { type MenuActionProperties } from '@dxos/react-ui-menu';

import { createComment } from '../comments';

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

export type PayloadType =
  | 'view-mode'
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
  | 'search'
  | 'strikethrough'
  | 'table';

export type EditorActionPayload = {
  type: PayloadType;
  data?: any;
};

export type EditorAction = Action<MenuActionProperties & EditorActionPayload>;

export type EditorPayloadHandler = (view: EditorView, payload: EditorActionPayload) => void;

export const processEditorPayload: EditorPayloadHandler = (view, { type, data }) => {
  let inlineType, listType;
  switch (type) {
    case 'heading':
      setHeading(parseInt(data))(view);
      break;

    case 'strong':
    case 'emphasis':
    case 'strikethrough':
    case 'code':
      inlineType =
        type === 'strong'
          ? Inline.Strong
          : type === 'emphasis'
            ? Inline.Emphasis
            : type === 'strikethrough'
              ? Inline.Strikethrough
              : Inline.Code;
      (typeof data === 'boolean' ? setStyle(inlineType, data) : toggleStyle(inlineType))(view);
      break;

    case 'list-ordered':
    case 'list-bullet':
    case 'list-task':
      listType = type === 'list-ordered' ? List.Ordered : type === 'list-bullet' ? List.Bullet : List.Task;
      (data === false ? removeList(listType) : data === true ? addList(listType) : toggleList(listType))(view);
      break;

    case 'blockquote':
      (data === false ? removeBlockquote : data === true ? addBlockquote : toggleBlockquote)(view);
      break;
    case 'codeblock':
      (data === false ? removeCodeblock : addCodeblock)(view);
      break;
    case 'table':
      insertTable(view);
      break;

    case 'link':
      (data === false ? removeLink : addLink())(view);
      break;

    case 'image':
      addLink({ url: data, image: true })(view);
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
