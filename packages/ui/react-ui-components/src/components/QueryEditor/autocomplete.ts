//
// Copyright 2025 DXOS.org
//

import { type EchoDatabase } from '@dxos/client/echo';
import { type Tag, Type } from '@dxos/echo';
import { QueryDSL } from '@dxos/echo-query';
import { type GetMenuContext } from '@dxos/react-ui-editor';

export type CompletionOptions = {
  db?: EchoDatabase;
  tags?: Tag.Map;
};

export const completions = ({ db, tags }: CompletionOptions) => {
  const parser = QueryDSL.Parser.configure({ strict: false });
  return ({ state, pos }: GetMenuContext): string[] => {
    const tree = parser.parse(state.sliceDoc());
    const { node } = tree.cursorAt(pos, -1);

    switch (node.parent?.type.id) {
      case QueryDSL.Node.TypeFilter: {
        let range: { from: number; to: number } | undefined;
        if (node?.type.id === QueryDSL.Node.Identifier) {
          range = { from: node.from, to: node.to };
        } else if (node?.type.name === ':') {
          range = { from: node.from + 1, to: node.to };
        }

        if (range) {
          const schema = db?.graph.schemaRegistry.schemas ?? [];
          return schema.map((schema) => Type.getTypename(schema));
        }

        break;
      }

      // TODO(burdon): Trigger on #.
      case QueryDSL.Node.TagFilter: {
        if (tags) {
          return Object.values(tags).map((tag) => tag.label);
        }

        break;
      }
    }

    return [];
  };
};
