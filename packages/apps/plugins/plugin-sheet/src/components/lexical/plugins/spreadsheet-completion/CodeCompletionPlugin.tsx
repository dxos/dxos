//
// Copyright 2024 DXOS.org
//

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister } from '@lexical/utils';
import { $createTextNode, TextNode } from 'lexical';
import React, { type ReactNode, useEffect } from 'react';

import findMatches from './findMatches';
import getQueryData from './getQueryData';
import { insertItemModifier } from './insertItemModifier';
import { TypeAheadPlugin } from '../typeahead/TypeAheadPlugin';

export default ({
  dataTestId,
  dataTestName = 'CodeTypeAhead',
}: {
  dataTestId?: string;
  dataTestName?: string;
}): JSX.Element => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const onCodeCompletionTextNodeTransform = (node: TextNode) => {
      // Prevent RichTextEditor from formatting mentions text in any way.
      if (node.getFormat() !== 0) {
        node.setFormat(0);
      }
    };

    return mergeRegister(editor.registerNodeTransform(TextNode, onCodeCompletionTextNodeTransform));
  }, [editor]);

  return (
    <TypeAheadPlugin
      arrowKeysShouldDismiss={true}
      createItemNode={createItemNode}
      dataTestId={dataTestId}
      dataTestName={dataTestName}
      getQueryData={getQueryData}
      findMatches={findMatches}
      insertItemModifier={insertItemModifier}
      itemRenderer={itemRenderer}
    />
  );
};

const createItemNode = (match: string) => $createTextNode(match);

const itemRenderer = (code: string, query: string) => {
  const children: ReactNode[] = [];
  let inProgress = '';
  let codeIndex = 0;
  let queryIndex = 0;

  while (codeIndex < code.length) {
    const queryChar = query.charAt(queryIndex) || '';
    const codeChar = code.charAt(codeIndex);

    if (codeChar.toLowerCase() === queryChar.toLowerCase()) {
      if (inProgress !== '') {
        children.push(<span key={children.length}>{inProgress}</span>);
      }

      children.push(
        <span className='text-blue-500' key={children.length}>
          {codeChar}
        </span>,
      );

      inProgress = '';
      queryIndex++;
    } else {
      inProgress += codeChar;
    }

    codeIndex++;
  }

  if (inProgress !== '') {
    children.push(<span key={children.length}>{inProgress}</span>);
  }

  return children;
};
