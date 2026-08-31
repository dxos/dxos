//
// Copyright 2025 DXOS.org
//

import { type Database, type Tag, Type } from '@dxos/echo';
import { QueryDSL } from '@dxos/echo-query';
import { type GetMenuContext } from '@dxos/react-ui-editor';

export type CompletionOptions = {
  db?: Database.Database;
  tags?: Tag.Map;
};

/**
 * Tag labels as they must appear in the document. Selecting a completion REPLACES the whole trigger
 * range, `#` included, and inserts the item verbatim — so an unprefixed label would silently drop the
 * `#` and leave text that no longer parses as a tag.
 */
const tagCompletions = (tags: Tag.Map): string[] => Object.values(tags).map((tag) => `#${tag.label}`);

/**
 * Whether the caret sits in a tag the user is still typing: a `#` at the start of the current word,
 * with only label characters between it and `pos`.
 */
const isTypingTag = (text: string, pos: number): boolean => {
  let index = pos;
  while (index > 0 && /[a-zA-Z0-9_-]/.test(text[index - 1])) {
    index--;
  }

  return index > 0 && text[index - 1] === '#';
};

export const completions = ({ db, tags }: CompletionOptions) => {
  const parser = QueryDSL.Parser.configure({ strict: false });
  return ({ state, pos }: GetMenuContext): string[] => {
    const text = state.sliceDoc();
    const tree = parser.parse(text);
    const { node } = tree.cursorAt(pos, -1);

    // A `#` with no label yet is an error node, not a `TagFilter` — the grammar needs a label
    // character before it accepts one — so the tree cannot answer for the keystroke that opens a tag.
    // Inside a string it is content, so the tree is still what settles that.
    if (tags && isTypingTag(text, pos) && node.type.id !== QueryDSL.Node.String) {
      return tagCompletions(tags);
    }

    switch (node.parent?.type.id) {
      case QueryDSL.Node.TypeFilter: {
        let range: { from: number; to: number } | undefined;
        if (node?.type.id === QueryDSL.Node.Identifier) {
          range = { from: node.from, to: node.to };
        } else if (node?.type.name === ':') {
          range = { from: node.from + 1, to: node.to };
        }

        if (range) {
          const schema = db ? [...db.graph.registry.list().filter(Type.isType)] : [];
          return schema.map((schema) => Type.getTypename(schema));
        }

        break;
      }

      case QueryDSL.Node.TagFilter: {
        if (tags) {
          return tagCompletions(tags);
        }

        break;
      }
    }

    return [];
  };
};
