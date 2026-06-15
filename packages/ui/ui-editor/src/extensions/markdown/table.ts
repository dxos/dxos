//
// Copyright 2023 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import {
  type EditorState,
  type Extension,
  type RangeSet,
  RangeSetBuilder,
  StateField,
  type Transaction,
} from '@codemirror/state';
import { Decoration, EditorView, WidgetType } from '@codemirror/view';

// TODO(burdon): Snippet to create basic table.
//  https://codemirror.net/docs/ref/#autocomplete.snippet
// TODO(burdon): Advanced formatting (left/right/center).
// TODO(burdon): Editor to auto balance columns.

export type TableOptions = {};

/**
 * GFM tables.
 * https://github.github.com/gfm/#tables-extension
 */
export const table = (options: TableOptions = {}): Extension => {
  return StateField.define<RangeSet<Decoration>>({
    create: (state) => update(state, options),
    update: (_: RangeSet<Decoration>, tr: Transaction) => update(tr.state, options),
    provide: (field) => EditorView.decorations.from(field),
  });
};

type Table = {
  from: number;
  to: number;
  header?: string[];
  rows?: string[][];
};

const update = (state: EditorState, _options: TableOptions) => {
  const builder = new RangeSetBuilder<Decoration>();
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
    const replace = state.readOnly || cursor < table.from || cursor > table.to;
    if (replace) {
      builder.add(
        table.from,
        table.to,
        Decoration.replace({
          block: true,
          widget: new TableWidget(table),
        }),
      );
    } else {
      // Add class for styling.
      // TODO(burdon): Apply to each line?
      builder.add(
        table.from,
        table.to,
        Decoration.mark({
          class: 'cm-table',
        }),
      );
    }
  });

  return builder.finish();
};

/** Renders cell text into el, processing inline markdown (bold, italic, code). */
const renderCellContent = (el: HTMLElement, text: string): void => {
  const parts = text.split(/(`[^`\n]+`|\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|_[^_\n]+_)/);
  for (const part of parts) {
    if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) {
      const code = document.createElement('code');
      code.textContent = part.slice(1, -1);
      el.appendChild(code);
    } else if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
      const strong = document.createElement('strong');
      strong.textContent = part.slice(2, -2);
      el.appendChild(strong);
    } else if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
      const em = document.createElement('em');
      em.textContent = part.slice(1, -1);
      el.appendChild(em);
    } else {
      el.appendChild(document.createTextNode(part));
    }
  }
};

class TableWidget extends WidgetType {
  constructor(readonly _table: Table) {
    super();
  }

  override eq(other: this) {
    return (
      this._table.header?.join() === other._table.header?.join() &&
      this._table.rows?.join() === other._table.rows?.join()
    );
  }

  override ignoreEvent(e: Event): boolean {
    return !/^mouse/.test(e.type);
  }

  override toDOM(_view: EditorView) {
    const div = document.createElement('div');
    const table = div.appendChild(document.createElement('table'));

    const header = table.appendChild(document.createElement('thead'));
    const tr = header.appendChild(document.createElement('tr'));
    this._table.header?.forEach((cell) => {
      const th = document.createElement('th');
      th.setAttribute('class', 'cm-table-head');
      renderCellContent(tr.appendChild(th), cell);
    });

    const body = table.appendChild(document.createElement('tbody'));
    this._table.rows?.forEach((row) => {
      const tr = body.appendChild(document.createElement('tr'));
      row.forEach((cell) => {
        const td = document.createElement('td');
        td.setAttribute('class', 'cm-table-cell');
        renderCellContent(tr.appendChild(td), cell);
      });
    });

    return div;
  }
}
