//
// Copyright 2023 DXOS.org
//

import { Tree } from '@braneframe/types';
import { TextObject } from '@dxos/client/echo';

export const parseOutline = (outline: string): Tree.Item[] | undefined => {
  if (!outline.startsWith('-')) {
    return undefined;
  }

  const stack: Tree.Item[] = [new Tree.Item()];

  for (const line of outline.split('\n')) {
    if (line.match(LINE_REGEX)) {
      const indent = countTabs(line);

      if (indent > stack.length - 1 && stack.at(-1)!.items.length > 0) {
        // Go deep
        stack.push(stack.at(-1)!.items.at(-1)!);
      }

      while (indent < stack.length - 1) {
        // Go up
        stack.pop();
      }

      stack.at(-1)!.items.push(
        new Tree.Item({
          text: new TextObject(line.replace(LINE_REGEX, '')),
        }),
      );
    } else {
      // Append to previous bullet

      const expectedIndent = stack.length - 1;
      const whitespaceCharCount = line.match(/^\s*/)?.[0].length ?? 0;

      const deleteLength = Math.min(whitespaceCharCount, expectedIndent + 2); // 2 is for '- '.
      const textContent = line.slice(deleteLength);

      if (stack.at(-1)!.items.length > 0) {
        stack
          .at(-1)!
          .items.at(-1)!
          .text.model?.insert(`\n${textContent}`, stack.at(-1)!.items.at(-1)!.text.text.length);
      } else {
        stack.at(-1)!.items.push(
          new Tree.Item({
            text: new TextObject(textContent),
          }),
        );
      }
    }
  }

  return [...stack[0].items];
};

const countTabs = (line: string): number => {
  let count = 0;
  for (const char of line) {
    if (char === '\t') {
      count++;
    } else {
      break;
    }
  }
  return count;
};

const LINE_REGEX = /^(\t*)- /;
