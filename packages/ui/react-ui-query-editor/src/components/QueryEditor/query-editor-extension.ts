//
// Copyright 2025 DXOS.org
//

import { EditorView, WidgetType } from '@codemirror/view';

import { type ChromaticPalette } from '@dxos/react-ui';
import { type XmlWidgetRegistry, extendedMarkdown, getXmlTextChild, xmlTags } from '@dxos/react-ui-editor';

export type QueryEditorTag = {
  id: string;
  label: string;
  hue?: ChromaticPalette;
};

export type QueryEditorText = {
  content: string;
};

export type QueryEditorItem = QueryEditorText | QueryEditorTag;

export const renderTag = (tag: QueryEditorTag) =>
  `<anchor${tag.hue ? ` hue="${tag.hue}"` : ''} refid="${tag.id}">${tag.label}</anchor> `;

export const renderTags = (tags: QueryEditorTag[]) => {
  return tags.map(renderTag).join('');
};

class TagWidget extends WidgetType {
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
    const anchor = document.createElement('dx-anchor');
    anchor.textContent = this.label;
    anchor.setAttribute('class', 'dx-tag');
    if (this.hue) {
      anchor.setAttribute('data-hue', this.hue);
    }
    anchor.setAttribute('refid', this.id);
    return anchor;
  }
}

export const queryEditorTagRegistry = {
  anchor: {
    block: false,
    factory: (props: any) => {
      const text = getXmlTextChild(props.children);
      return text ? new TagWidget(text, props.refid, props.hue) : null;
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
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'middle',
    },
    'dx-anchor': {},
  }),
];
