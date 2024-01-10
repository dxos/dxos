//
// Copyright 2024 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import {
  type EditorState,
  type Extension,
  type RangeSet,
  type Transaction,
  RangeSetBuilder,
  StateField,
} from '@codemirror/state';
import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import _mermaid from 'mermaid';

import { getToken } from '@dxos/react-ui-editor';

export type MermaidOptions = {};

// TODO(burdon): Move to mermaid-plugin (which should contribute this extension).
export const mermaid = (options: MermaidOptions = {}): Extension => {
  return [
    StateField.define<RangeSet<any>>({
      create: (state) => update(state, options),
      update: (_: RangeSet<any>, tr: Transaction) => update(tr.state, options),
      provide: (field) => EditorView.decorations.from(field),
    }),
    styles,
  ];
};

const update = (state: EditorState, options: MermaidOptions) => {
  const builder = new RangeSetBuilder();
  const cursor = state.selection.main.head;

  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.name === 'FencedCode') {
        if (state.readOnly || cursor < node.from || cursor > node.to) {
          const info = node.node.getChild('CodeInfo');
          if (info) {
            const type = state.sliceDoc(info.from, info.to);
            const text = node.node.getChild('CodeText');
            if (type === 'mermaid' && text) {
              const content = state.sliceDoc(text.from, text.to);
              builder.add(
                node.from,
                node.to,
                Decoration.replace({
                  widget: new MermaidWidget(content),
                }),
              );
            }
          }
        }
      }
    },
  });

  return builder.finish();
};

class MermaidWidget extends WidgetType {
  _svg: string | undefined;
  _error: string | undefined;

  constructor(private readonly _source: string) {
    super();
  }

  override eq(other: MermaidWidget) {
    return this._source === other._source;
  }

  toDOM(view: EditorView) {
    const wrapper = document.createElement('div');
    wrapper.className = 'cm-mermaid';

    if (this._svg) {
      wrapper.innerHTML = this._svg;
    } else {
      setTimeout(async () => {
        // https://github.com/mermaid-js/mermaid/blob/master/packages/mermaid/src/config.type.ts
        _mermaid.initialize({
          darkMode: view.state.facet(EditorView.darkTheme),
          theme: 'neutral',
          // TODO(burdon): Styles.
          // NOTE: Must specify 'base' in order to override.
          // theme: 'base',
          // themeVariables: {
          //   primaryColor: getToken('extend.colors.red.100'),
          //   primaryBorderColor: getToken('extend.colors.neutral.200'),
          // },
          // https://github.com/mermaid-js/mermaid/blob/master/packages/mermaid/src/diagrams/flowchart/styles.ts
          // https://github.com/mermaid-js/mermaid/blob/master/packages/mermaid/src/diagrams/sequence/styles.js
          // https://github.com/mermaid-js/mermaid/blob/master/packages/mermaid/src/diagrams/state/styles.js
          // themeCSS: '.node rect { fill: red; }',
        });

        this._svg = await this.render();
        if (this._error) {
          wrapper.innerText = this._error;
          wrapper.className = 'cm-mermaid-error';
        } else {
          wrapper.innerHTML = this._svg ?? '';
        }
        view.requestMeasure();
      });
    }

    return wrapper;
  }

  async render(): Promise<string | undefined> {
    try {
      // https://github.com/mermaid-js/mermaid
      const valid = await _mermaid.parse(this._source);
      if (valid) {
        const result = await _mermaid.render('test', this._source);
        this._error = undefined;
        this._svg = result.svg;
        return result.svg;
      }
    } catch (err: any) {
      this._error = String(err);
      this._svg = undefined;
    }
  }

  override ignoreEvent(e: Event) {
    return !/^mouse/.test(e.type);
  }
}

const styles = EditorView.baseTheme({
  '& .cm-mermaid': {
    display: 'inline-flex',
    justifyContent: 'center',
  },
  '& .cm-mermaid-error': {
    display: 'inline-block',
    color: getToken('extend.colors.red.500'),
  },
});
