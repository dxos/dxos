//
// Copyright 2023 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { type EditorState, type RangeSet, RangeSetBuilder, StateField, type Transaction } from '@codemirror/state';
import { Decoration, EditorView, WidgetType } from '@codemirror/view';

// TODO(burdon): Snippet to create basic table.
//  https://codemirror.net/docs/ref/#autocomplete.snippet

export type TableOptions = {};

/**
 * GFM tables.
 * https://github.github.com/gfm/#tables-extension
 */
export const table = (options: TableOptions = {}) => {
  return StateField.define<RangeSet<any>>({
    create: (state) => update(state, options),
    update: (_: RangeSet<any>, tr: Transaction) => update(tr.state, options),
    provide: (field) => EditorView.decorations.from(field),
  });
};

type Table = {
  from: number;
  to: number;
  header?: string[];
  rows?: string[][];
};

const update = (state: EditorState, options: TableOptions) => {
  const builder = new RangeSetBuilder();
  const cursor = state.selection.main.head;

  const tables: Table[] = [];
  const getTable = () => tables[tables.length - 1];
  const getRow = () => {
    const table = getTable();
    return table.rows?.[table.rows.length - 1];
  };

  // Parse table.
  syntaxTree(state).iterate({
    enter: (node) => {
      // Check if cursor is inside text.
      switch (node.name) {
        case 'Table': {
          tables.push({ from: node.from, to: node.to });
          break;
        }
        case 'TableHeader': {
          getTable().header = [];
          break;
        }
        case 'TableRow': {
          (getTable().rows ??= []).push([]);
          break;
        }
        case 'TableCell': {
          const row = getRow();
          if (row) {
            row.push(state.sliceDoc(node.from, node.to));
          } else {
            getTable().header?.push(state.sliceDoc(node.from, node.to));
          }
          break;
        }
      }
    },
  });

  tables.forEach((table) => {
    const hide = state.readOnly || cursor < table.from || cursor > table.to;
    hide && builder.add(table.from, table.to, Decoration.replace({ widget: new TableWidget(table) }));
    builder.add(table.from, table.to, Decoration.mark({ class: 'cm-table' }));
  });

  return builder.finish();
};

class TableWidget extends WidgetType {
  constructor(readonly _table: Table) {
    super();
  }

  override eq(other: WidgetType) {
    return this._table.from === (other as any as TableWidget)?._table?.from;
  }

  toDOM(view: EditorView) {
    const table = document.createElement('table');

    {
      const header = table.appendChild(document.createElement('thead'));
      const tr = header.appendChild(document.createElement('tr'));
      this._table.header?.forEach((cell) => {
        const th = document.createElement('th');
        th.setAttribute('class', 'cm-table-head');
        tr.appendChild(th).textContent = cell;
      });
    }

    {
      const body = table.appendChild(document.createElement('tbody'));
      this._table.rows?.forEach((row) => {
        const tr = body.appendChild(document.createElement('tr'));
        row.forEach((cell) => {
          const td = document.createElement('td');
          td.setAttribute('class', 'cm-table-cell');
          tr.appendChild(td).textContent = cell;
        });
      });
    }

    return table;
  }
}
