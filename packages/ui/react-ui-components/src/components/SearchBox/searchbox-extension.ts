//
// Copyright 2025 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { type EditorState, type Extension } from '@codemirror/state';
import { EditorView, WidgetType } from '@codemirror/view';

import { type ChromaticPalette } from '@dxos/react-ui';
import { type XmlWidgetRegistry, extendedMarkdown, getXmlTextChild, xmlTags } from '@dxos/react-ui-editor';
import { isTruthy } from '@dxos/util';

import { type QueryItem, type QueryTag, type QueryText, itemIsTag, itemIsText } from './types';

export type SearchBoxOptions = { onChange?: (items: QueryItem[]) => void };

export const searchbox = ({ onChange }: SearchBoxOptions): Extension => {
  return [
    extendedMarkdown({ registry: queryEditorTagRegistry }),
    xmlTags({ registry: queryEditorTagRegistry }),
    onChange &&
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const queryItems = parseQueryItems(update.state);
          onChange(queryItems);
        }
      }),
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
  ].filter(isTruthy);
};

/**
 * Parse the CodeMirror content to extract QueryItems from the AST.
 * Regular text is converted to QueryText objects (trimmed).
 * Anchor elements are converted to QueryTag objects.
 */
// TODO(burdon): Deprecate in favor of echo-query parser (see QueryEditor).
export const parseQueryItems = (state: EditorState): QueryItem[] => {
  const tree = syntaxTree(state);
  const doc = state.doc;

  if (!tree || (tree.type.name === 'Program' && tree.length === 0)) {
    // If no tree or empty, treat entire content as text.
    const content = doc.toString().trim();
    if (content) {
      return [{ content }];
    }
    return [];
  }

  // Collect all items with their positions for proper ordering.
  const itemsWithPositions: Array<{ position: number; item: QueryItem }> = [];
  const processedRanges: Array<{ from: number; to: number }> = [];

  // First pass: find all anchor elements and collect them with positions.
  tree.iterate({
    enter: (node) => {
      if (node.type.name === 'Element') {
        try {
          // Parse the element to check if it's an anchor.
          const openTag = node.node.getChild('OpenTag') || node.node.getChild('SelfClosingTag');
          if (openTag) {
            const tagName = openTag.getChild('TagName');
            if (tagName) {
              const tagNameText = doc.sliceString(tagName.from, tagName.to);
              if (tagNameText === 'anchor') {
                // Extract anchor attributes.
                let refid = '';
                let hue: ChromaticPalette | undefined;
                let label = '';

                // Extract attributes.
                let attributeNode = openTag.getChild('Attribute');
                while (attributeNode) {
                  const attrName = attributeNode.getChild('AttributeName');
                  const attrValue = attributeNode.getChild('AttributeValue');
                  if (attrName) {
                    const attr = doc.sliceString(attrName.from, attrName.to);
                    if (attrValue) {
                      let value = doc.sliceString(attrValue.from, attrValue.to);
                      // Remove quotes.
                      if (
                        (value.startsWith('"') && value.endsWith('"')) ||
                        (value.startsWith("'") && value.endsWith("'"))
                      ) {
                        value = value.slice(1, -1);
                      }
                      if (attr === 'refid') {
                        refid = value;
                      } else if (attr === 'hue') {
                        hue = value as ChromaticPalette;
                      }
                    }
                  }
                  attributeNode = attributeNode.nextSibling;
                }

                // Extract text content (label).
                if (node.type.name === 'Element' && openTag.type.name !== 'SelfClosingTag') {
                  let child = node.node.firstChild;
                  while (child) {
                    if (child.type.name === 'Text') {
                      const text = doc.sliceString(child.from, child.to).trim();
                      if (text) {
                        label = text;
                        break;
                      }
                    }
                    child = child.nextSibling;
                  }
                }

                if (refid && label) {
                  const queryTag: QueryTag = { id: refid, label };
                  if (hue) {
                    queryTag.hue = hue;
                  }
                  // Store the anchor with its position.
                  itemsWithPositions.push({ position: node.node.from, item: queryTag });
                  processedRanges.push({ from: node.node.from, to: node.node.to });
                }
              }
            }
          }
        } catch {
          // Ignore parsing errors.
        }

        return false; // Don't descend into children.
      }
    },
  });

  // Second pass: extract text content not covered by anchor elements.
  let currentPos = 0;
  const docLength = doc.length;

  // Sort processed ranges by position.
  processedRanges.sort((a, b) => a.from - b.from);

  for (const range of processedRanges) {
    // Add text before this anchor.
    if (currentPos < range.from) {
      const textContent = doc.sliceString(currentPos, range.from).trim();
      if (textContent) {
        itemsWithPositions.push({ position: currentPos, item: { content: textContent } });
      }
    }
    currentPos = range.to;
  }

  // If no anchors were found, treat entire content as text.
  if (processedRanges.length === 0) {
    const content = doc.toString().trim();
    if (content) {
      return [{ content }];
    }
  } else if (currentPos < docLength) {
    // Add remaining text after the last anchor.
    const textContent = doc.sliceString(currentPos, docLength).trim();
    if (textContent) {
      itemsWithPositions.push({ position: currentPos, item: { content: textContent } });
    }
  }

  // Sort all items by position and return just the items.
  itemsWithPositions.sort((a, b) => a.position - b.position);
  return itemsWithPositions.map(({ item }) => item);
};

export const renderTag = (tag: QueryTag) =>
  `<anchor${tag.hue ? ` hue="${tag.hue}"` : ''} refid="${tag.id}">${tag.label}</anchor>`;

export const renderText = (text: QueryText) => `${text.content}`;

export const renderItems = (items: QueryItem[]) => {
  return items
    .map((item) => {
      if (itemIsTag(item)) {
        return renderTag(item);
      } else if (itemIsText(item)) {
        return renderText(item);
      } else {
        return false;
      }
    })
    .filter(Boolean)
    .join(' ');
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
