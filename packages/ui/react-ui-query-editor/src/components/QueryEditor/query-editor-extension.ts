//
// Copyright 2025 DXOS.org
//

import { EditorView, WidgetType } from '@codemirror/view';

import { type ChromaticPalette } from '@dxos/react-ui';
import { type XmlWidgetRegistry, extendedMarkdown, getXmlTextChild, xmlTags } from '@dxos/react-ui-editor';

export type QueryEditorItemData = {
  id: string;
  label: string;
  hue?: ChromaticPalette;
};

export const renderTag = (item: QueryEditorItemData) =>
  `<anchor${item.hue ? ` hue="${item.hue}"` : ''} refid="${item.id}">${item.label}</anchor> `;

export const renderTags = (items: QueryEditorItemData[]) => {
  return items.map(renderTag).join('');
};

class AnchorWidget extends WidgetType {
  private label: string;
  private id: string;
  private hue?: string;

  constructor(label: string, id: string, hue: string = 'neutral') {
    super();
    this.label = label;
    this.id = id;
    this.hue = hue;
  }

  // Prevents re-rendering.
  override eq(widget: this): boolean {
    return widget.label === this.label && widget.id === this.id;
  }

  toDOM(): HTMLElement {
    const el = document.createElement('dx-anchor');
    el.textContent = this.label;
    el.setAttribute('class', 'dx-tag');
    if (this.hue) {
      el.setAttribute('data-hue', this.hue);
    }
    el.setAttribute('refid', this.id);
    return el;
  }
}

export const queryEditorTagRegistry = {
  anchor: {
    block: false,
    factory: (props: any) => {
      const text = getXmlTextChild(props.children);
      return text ? new AnchorWidget(text, props.refid, props.hue) : null;
    },
  },
} satisfies XmlWidgetRegistry;

export const queryEditorTags = [
  extendedMarkdown({ registry: queryEditorTagRegistry }),
  xmlTags({ registry: queryEditorTagRegistry }),
  EditorView.theme({
    // Hide scrollbar.
    '.cm-scroller': {
      scrollbarWidth: 'none', // Firefox.
    },
    '.cm-scroller::-webkit-scrollbar': {
      display: 'none', // WebKit.
    },
    '.cm-line': {
      lineHeight: '1.125rem !important',
    },
    'dx-anchor': {
      verticalAlign: 'middle',
    },
  }),
];
