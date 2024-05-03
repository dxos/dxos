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

  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.name === 'FencedCode') {
        const cursor = state.selection.main.head;
        if (state.readOnly || cursor < node.from || cursor > node.to) {
          const info = node.node.getChild('CodeInfo');
          if (info) {
            const type = state.sliceDoc(info.from, info.to);
            const text = node.node.getChild('CodeText');
            if (type === 'mermaid' && text) {
              const content = state.sliceDoc(text.from, text.to);
              // TODO(burdon): Error if extension defined AFTER decorateMarkdown.
              //  Decorations that replace line breaks may not be specified via plugins
              builder.add(
                node.from,
                node.to,
                Decoration.replace({
                  widget: new MermaidWidget(`mermaid-${node.from}`, content),
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

  // TODO(burdon): Mermaid API requires unique id.
  constructor(
    private readonly _id: string,
    private readonly _source: string,
  ) {
    super();
  }

  override eq(other: this) {
    return this._source === other._source;
  }

  override toDOM(view: EditorView) {
    const wrapper = document.createElement('div');

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

      // TODO(burdon): Cache?
      const svg = await this.render(wrapper);
      if (this._error) {
        wrapper.className = 'cm-mermaid-error';
        wrapper.innerText = this._error;
      } else {
        wrapper.className = 'cm-mermaid';
        wrapper.innerHTML = svg!;

        // const label = document.createElement('span');
        // label.innerText = 'Mermaid';
        // label.className = 'cm-mermaid-label';
        // wrapper.appendChild(label);
        view.requestMeasure();
      }
    });

    return wrapper;
  }

  async render(container: Element): Promise<string | undefined> {
    try {
      // https://github.com/mermaid-js/mermaid
      const valid = await _mermaid.parse(this._source);
      if (valid) {
        const result = await _mermaid.render(this._id, this._source);
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
    position: 'relative',
    display: 'inline-flex',
    width: '100%',
    justifyContent: 'center',
    // backgroundColor: getToken('extend.colors.neutral.50'),
  },
  // '& .cm-mermaid-label': {
  //   position: 'absolute',
  //   right: 0,
  //   textSize: 10,
  // },
  '& .cm-mermaid-error': {
    display: 'inline-block',
    color: getToken('extend.colors.red.500'),
  },
});
