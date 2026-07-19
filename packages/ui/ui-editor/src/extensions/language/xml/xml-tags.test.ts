//
// Copyright 2026 DXOS.org
//

import { forceParsing } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { EditorView, WidgetType } from '@codemirror/view';
import { describe, test } from 'vitest';

import { trim } from '@dxos/util';

import { decorationSetToArray } from '../../../util';
import { extendedMarkdown } from './extended-markdown';
import {
  type XmlWidgetDef,
  type XmlWidgetProps,
  navigateNextEffect,
  navigatePreviousEffect,
  xmlTagRebuildEffect,
  xmlTagResetEffect,
  xmlTags,
} from './xml-tags';

//
// Harness.
//
// These are characterization tests: they lock in the CURRENT observable behavior of `xmlTags`'s
// decoration builder before it is optimized (viewport-aware rebuilds). They read the real decoration
// field through the public `EditorView.decorations` facet — not the DOM — so they are independent of
// happy-dom's lack of layout and survive internal refactors. Each registry entry is given a recording
// `factory` widget so the built widget's props (id) can be inspected.
//

/** Widget whose props are inspectable so tests can assert the id the builder assigned. */
class TestWidget extends WidgetType {
  constructor(readonly props: XmlWidgetProps) {
    super();
  }

  override eq(other: this): boolean {
    return other instanceof TestWidget && other.props.id === this.props.id;
  }

  override toDOM(): HTMLElement {
    const el = document.createElement('span');
    el.className = 'cm-test-xml';
    el.dataset.tag = String(this.props._tag ?? '');
    return el;
  }

  override ignoreEvent(): boolean {
    return true;
  }
}

/** Attach a recording factory to each registry entry. */
const withFactory = (defs: Record<string, Omit<XmlWidgetDef, 'factory'>>): Record<string, XmlWidgetDef> =>
  Object.fromEntries(
    Object.entries(defs).map(([tag, def]) => [tag, { ...def, factory: (props) => new TestWidget(props) }]),
  );

type Descriptor = {
  from: number;
  to: number;
  tag: string;
  block: boolean;
  streaming: boolean;
  id: string | undefined;
};

/** Read the live xmlTags decoration field via the public decorations facet. */
const xmlDecorations = (view: EditorView): Descriptor[] => {
  const out: Descriptor[] = [];
  for (const source of view.state.facet(EditorView.decorations)) {
    const set = typeof source === 'function' ? source(view) : source;
    if (!set) {
      continue;
    }
    for (const { from, to, value } of decorationSetToArray(set)) {
      const spec: any = value.spec ?? {};
      // Only xmlTags decorations carry a `tag` spec.
      if (spec.tag === undefined) {
        continue;
      }
      out.push({
        from,
        to,
        tag: spec.tag,
        block: !!spec.block,
        streaming: !!spec.streaming,
        id: spec.widget?.props?.id ?? spec.widget?.id,
      });
    }
  }

  return out.sort((a, b) => a.from - b.from || a.to - b.to);
};

const flush = () => new Promise<void>((resolve) => queueMicrotask(resolve));

const createView = (
  doc: string,
  { registry = {}, bookmarks, setWidgets }: Parameters<typeof xmlTags>[0] = {},
): EditorView => {
  const parent = document.createElement('div');
  return new EditorView({
    state: EditorState.create({
      doc,
      extensions: [extendedMarkdown({ registry }), xmlTags({ registry, bookmarks, setWidgets })],
    }),
    parent,
  });
};

/** Force a complete parse + full decoration rebuild, then read — the ground-truth builder output. */
const rebuild = async (view: EditorView): Promise<Descriptor[]> => {
  forceParsing(view, view.state.doc.length, 5_000);
  view.dispatch({ effects: xmlTagRebuildEffect.of(null) });
  await flush();
  return xmlDecorations(view);
};

describe('xmlTags decorations', () => {
  test('empty document yields no decorations', async ({ expect }) => {
    const view = createView('', { registry: withFactory({ prompt: { block: true } }) });
    expect(await rebuild(view)).toEqual([]);
    view.destroy();
  });

  test('no registry yields no decorations', async ({ expect }) => {
    const view = createView('<prompt>hello</prompt>');
    expect(await rebuild(view)).toEqual([]);
    view.destroy();
  });

  test('block element becomes a block widget spanning the whole element', async ({ expect }) => {
    const doc = '<prompt>hello</prompt>';
    const view = createView(doc, { registry: withFactory({ prompt: { block: true } }) });
    const decorations = await rebuild(view);
    expect(decorations).toEqual([
      { from: 0, to: doc.length, tag: 'prompt', block: true, streaming: false, id: `cm-xml-0-${doc.length}` },
    ]);
    view.destroy();
  });

  test('inline element becomes an inline widget', async ({ expect }) => {
    const doc = 'see <reference>x</reference> here';
    const view = createView(doc, { registry: withFactory({ reference: { block: false } }) });
    const [decoration] = await rebuild(view);
    expect(decoration.tag).toBe('reference');
    expect(decoration.block).toBe(false);
    expect(decoration.from).toBe(4);
    expect(decoration.to).toBe('see <reference>x</reference>'.length);
    view.destroy();
  });

  test('unregistered tags are ignored', async ({ expect }) => {
    const view = createView('<mystery>x</mystery>', { registry: withFactory({ prompt: { block: true } }) });
    expect(await rebuild(view)).toEqual([]);
    view.destroy();
  });

  test('self-closing element is decorated', async ({ expect }) => {
    const view = createView('<toolkit />', { registry: withFactory({ toolkit: { block: true } }) });
    const decorations = await rebuild(view);
    expect(decorations).toHaveLength(1);
    expect(decorations[0].tag).toBe('toolkit');
    view.destroy();
  });

  test('explicit id attribute wins over the position-derived id', async ({ expect }) => {
    const view = createView('<prompt id="chosen">x</prompt>', { registry: withFactory({ prompt: { block: true } }) });
    const [decoration] = await rebuild(view);
    expect(decoration.id).toBe('chosen');
    view.destroy();
  });

  test('multiple elements are decorated in document order', async ({ expect }) => {
    const doc = trim`
      <prompt>a</prompt>

      middle

      <summary>b</summary>
    `;
    const view = createView(doc, { registry: withFactory({ prompt: { block: true }, summary: { block: true } }) });
    const decorations = await rebuild(view);
    expect(decorations.map((decoration) => decoration.tag)).toEqual(['prompt', 'summary']);
    expect(decorations[0].from).toBeLessThan(decorations[1].from);
    view.destroy();
  });

  test('tags inside a fenced code block are not decorated', async ({ expect }) => {
    const doc = trim`
      \`\`\`xml
      <prompt>ignored</prompt>
      \`\`\`
    `;
    const view = createView(doc, { registry: withFactory({ prompt: { block: true } }) });
    expect(await rebuild(view)).toEqual([]);
    view.destroy();
  });

  describe('streaming tags', () => {
    test('an unclosed streaming tag decorates from the tag to the document end', async ({ expect }) => {
      const doc = 'intro\n\n<think>partial output';
      const view = createView(doc, { registry: withFactory({ think: { streaming: true } }) });
      const decorations = await rebuild(view);
      expect(decorations).toHaveLength(1);
      const [decoration] = decorations;
      expect(decoration.tag).toBe('think');
      expect(decoration.streaming).toBe(true);
      expect(decoration.from).toBe(doc.indexOf('<think>'));
      expect(decoration.to).toBe(doc.length);
      // Streaming widgets keep an open-position id so the portal survives the closing tag arriving.
      expect(decoration.id).toBe(`cm-xml-${doc.indexOf('<think>')}`);
      view.destroy();
    });

    test('a closed streaming tag decorates the element and is no longer streaming', async ({ expect }) => {
      const doc = '<think>done</think>';
      const view = createView(doc, { registry: withFactory({ think: { streaming: true } }) });
      const decorations = await rebuild(view);
      expect(decorations).toHaveLength(1);
      const [decoration] = decorations;
      expect(decoration.streaming).toBe(false);
      expect(decoration.from).toBe(0);
      expect(decoration.to).toBe(doc.length);
      // A streaming def keeps the open-position id form even when closed.
      expect(decoration.id).toBe('cm-xml-0');
      view.destroy();
    });

    test('only the first unclosed streaming tag is decorated', async ({ expect }) => {
      const doc = '<think>one</think>\n\n<think>two unclosed';
      const view = createView(doc, { registry: withFactory({ think: { streaming: true } }) });
      const decorations = await rebuild(view);
      const streaming = decorations.filter((decoration) => decoration.streaming);
      expect(streaming).toHaveLength(1);
      expect(streaming[0].from).toBe(doc.lastIndexOf('<think>'));
      view.destroy();
    });
  });

  describe('url-scheme widgets', () => {
    const registry = withFactory({
      embed: { block: true, urlSchemes: ['dxn:'] },
      chip: { block: false, urlSchemes: ['dxn:'] },
    });

    test('image node with a matching scheme becomes a block widget', async ({ expect }) => {
      const doc = '![label](dxn:123)';
      const view = createView(doc, { registry });
      const [decoration] = await rebuild(view);
      expect(decoration.tag).toBe('embed');
      expect(decoration.block).toBe(true);
      expect(decoration.id).toBe('cm-url-dxn:123-0');
      view.destroy();
    });

    test('link node with a matching scheme becomes an inline widget', async ({ expect }) => {
      const doc = '[label](dxn:123)';
      const view = createView(doc, { registry });
      const [decoration] = await rebuild(view);
      expect(decoration.tag).toBe('chip');
      expect(decoration.block).toBe(false);
      view.destroy();
    });

    test('repeated occurrences of the same url get stable incrementing ids', async ({ expect }) => {
      const doc = '![a](dxn:x)\n\n![b](dxn:x)';
      const view = createView(doc, { registry });
      const ids = (await rebuild(view)).map((decoration) => decoration.id);
      expect(ids).toEqual(['cm-url-dxn:x-0', 'cm-url-dxn:x-1']);
      view.destroy();
    });

    test('non-matching schemes are ignored', async ({ expect }) => {
      const view = createView('![a](https://example.com/x.png)', { registry });
      expect(await rebuild(view)).toEqual([]);
      view.destroy();
    });
  });

  describe('effects', () => {
    test('reset effect clears decorations when the document is unchanged', async ({ expect }) => {
      const view = createView('<prompt>x</prompt>', { registry: withFactory({ prompt: { block: true } }) });
      expect(await rebuild(view)).toHaveLength(1);
      view.dispatch({ effects: xmlTagResetEffect.of(null) });
      await flush();
      expect(xmlDecorations(view)).toEqual([]);
      view.destroy();
    });
  });

  describe('incremental rebuild matches a full rebuild (optimization invariant)', () => {
    const registry = withFactory({ prompt: { block: true }, summary: { block: true }, reference: { block: false } });

    const seed = trim`
      # Title

      <prompt>first</prompt>

      Some prose with a <reference>ref</reference> inline.

      <summary>done</summary>
    `;

    // KNOWN BUG (to fix during the viewport optimization). Appending after the last widget takes the
    // partial-merge branch, which re-walks the last element and ADDS its decoration again without
    // removing the old one (the merge only filters out `streaming` decorations), so the last widget is
    // duplicated. In a live editor the parse-completion full rebuild (see the "settles" test below)
    // masks this transiently. When the optimization fixes the merge, flip `test.fails` → `test`.
    test.fails('appending at the tail — synchronous incremental result matches a full rebuild', async ({ expect }) => {
      const view = createView(seed, { registry });
      await rebuild(view);
      view.dispatch({ changes: { from: view.state.doc.length, insert: '\n\ntrailing text' } });
      const incremental = xmlDecorations(view);
      const full = await rebuild(view);
      expect(incremental).toEqual(full);
      view.destroy();
    });

    test('appending at the tail — settles to a correct decoration set', async ({ expect }) => {
      const view = createView(seed, { registry });
      await rebuild(view);
      view.dispatch({ changes: { from: view.state.doc.length, insert: '\n\ntrailing text' } });
      await flush(); // Let the parse-completion plugin issue its full rebuild.
      const settled = xmlDecorations(view);
      const full = await rebuild(view);
      expect(settled).toEqual(full);
      view.destroy();
    });

    test('inserting at the head', async ({ expect }) => {
      const view = createView(seed, { registry });
      await rebuild(view);
      view.dispatch({ changes: { from: 0, insert: 'PREFIX\n\n' } });
      const incremental = xmlDecorations(view);
      const full = await rebuild(view);
      expect(incremental).toEqual(full);
      view.destroy();
    });

    test('editing in the middle', async ({ expect }) => {
      const view = createView(seed, { registry });
      await rebuild(view);
      const at = seed.indexOf('Some prose');
      view.dispatch({ changes: { from: at, insert: 'EDIT ' } });
      const incremental = xmlDecorations(view);
      const full = await rebuild(view);
      expect(incremental).toEqual(full);
      view.destroy();
    });
  });

  describe('bookmark navigation', () => {
    const registry = withFactory({ prompt: { block: true }, summary: { block: true } });
    const doc = trim`
      intro

      <prompt>one</prompt>

      middle

      <summary>two</summary>

      end
    `;

    test('navigate-next moves the selection toward the next bookmarked tag', async ({ expect }) => {
      const view = createView(doc, { registry, bookmarks: ['prompt', 'summary'] });
      await rebuild(view);
      view.dispatch({ selection: { anchor: 0 } });
      view.dispatch({ effects: navigateNextEffect.of() });
      await flush();
      expect(view.state.selection.main.head).toBeGreaterThan(0);
      view.destroy();
    });

    test('navigate-previous moves the selection toward an earlier bookmarked tag', async ({ expect }) => {
      const view = createView(doc, { registry, bookmarks: ['prompt', 'summary'] });
      await rebuild(view);
      view.dispatch({ selection: { anchor: view.state.doc.length } });
      view.dispatch({ effects: navigatePreviousEffect.of() });
      await flush();
      expect(view.state.selection.main.head).toBeLessThan(view.state.doc.length);
      view.destroy();
    });
  });
});
