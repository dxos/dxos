//
// Copyright 2026 DXOS.org
//

import { forceParsing } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { EditorView, WidgetType } from '@codemirror/view';
import { describe, test } from 'vitest';

import { decorationSetToArray } from '../../util';
import { extendedMarkdown, xmlTags } from '../language/xml';
import { type ObjectLinkProps, objectLinks } from './object-links';
import { type WidgetDef, WidgetHostOptions, type WidgetState, widgetHost, widgetRebuildEffect } from './widgets';

/** Widget whose props are inspectable so tests can assert the id the builder assigned. */
class TestWidget extends WidgetType {
  constructor(readonly props: ObjectLinkProps) {
    super();
  }

  override eq(other: this): boolean {
    return other instanceof TestWidget && other.props.id === this.props.id;
  }

  override toDOM(): HTMLElement {
    const el = document.createElement('span');
    el.dataset.tag = this.props._tag;
    return el;
  }

  override ignoreEvent(): boolean {
    return true;
  }
}

const recording: WidgetDef<ObjectLinkProps> = { factory: (props) => new TestWidget(props) };

type Descriptor = { from: number; to: number; tag: string; block: boolean; id: string | undefined };

/** Read the live widget decorations via the public decorations facet. */
const decorations = (view: EditorView): Descriptor[] => {
  const out: Descriptor[] = [];
  for (const source of view.state.facet(EditorView.decorations)) {
    const set = typeof source === 'function' ? source(view) : source;
    if (!set) {
      continue;
    }
    for (const { from, to, value } of decorationSetToArray(set)) {
      const spec: { tag?: string; block?: boolean; widget?: { props?: { id?: string }; id?: string } } =
        value.spec ?? {};
      if (spec.tag === undefined) {
        continue;
      }
      out.push({ from, to, tag: spec.tag, block: !!spec.block, id: spec.widget?.props?.id ?? spec.widget?.id });
    }
  }

  return out.sort((a, b) => a.from - b.from || a.to - b.to);
};

const flush = () => new Promise<void>((resolve) => queueMicrotask(resolve));

const createView = (
  doc: string,
  options: Parameters<typeof objectLinks>[0] = { link: recording, image: recording },
  setWidgets?: WidgetHostOptions['setWidgets'],
): EditorView => {
  const parent = document.createElement('div');
  return new EditorView({
    state: EditorState.create({
      doc,
      extensions: [extendedMarkdown({ registry: {} }), widgetHost({ setWidgets }), objectLinks(options)],
    }),
    parent,
  });
};

/** Force a complete parse + full decoration rebuild, then read. */
const rebuild = async (view: EditorView): Promise<Descriptor[]> => {
  forceParsing(view, view.state.doc.length, 5_000);
  view.dispatch({ effects: widgetRebuildEffect.of(null) });
  await flush();
  return decorations(view);
};

describe('objectLinks', () => {
  test('image node with a matching scheme becomes a block widget', async ({ expect }) => {
    const view = createView('![label](eid:123)');
    const [decoration] = await rebuild(view);
    expect(decoration.tag).toBe('image');
    expect(decoration.block).toBe(true);
    expect(decoration.id).toBe('cm-url-eid:123-0');
    view.destroy();
  });

  test('link node with a matching scheme becomes an inline widget', async ({ expect }) => {
    const view = createView('[label](eid:123)');
    const [decoration] = await rebuild(view);
    expect(decoration.tag).toBe('link');
    expect(decoration.block).toBe(false);
    view.destroy();
  });

  test('repeated occurrences of the same url get stable incrementing ids', async ({ expect }) => {
    const view = createView('![a](eid:x)\n\n![b](eid:x)');
    const ids = (await rebuild(view)).map((decoration) => decoration.id);
    expect(ids).toEqual(['cm-url-eid:x-0', 'cm-url-eid:x-1']);
    view.destroy();
  });

  test('non-matching schemes are ignored', async ({ expect }) => {
    const view = createView('![a](https://example.com/x.png)');
    expect(await rebuild(view)).toEqual([]);
    view.destroy();
  });

  test('an image without a block widget is left as it is', async ({ expect }) => {
    const view = createView('![a](eid:x) and [b](eid:y)', { link: recording });
    const tags = (await rebuild(view)).map((decoration) => decoration.tag);
    expect(tags).toEqual(['link']);
    view.destroy();
  });

  // The first-document-render path: no rebuild effect, no edit — decorations must appear from
  // `create()` plus the parse-completion listener alone.
  test('block and inline widgets build on first mount without a rebuild effect', async ({ expect }) => {
    const view = createView('# Title\n\nsee [x](eid:123)\n\n![label](eid:456)\n');
    // Deterministic: complete the parse synchronously; the parse-completion listener then rebuilds.
    forceParsing(view, view.state.doc.length, 5_000);
    await flush();
    const built = decorations(view);
    expect(built.some((decoration) => !decoration.block)).toBe(true);
    expect(built.some((decoration) => decoration.block)).toBe(true);
    view.destroy();
  });

  // The Component (StubWidget) branch the app uses — asserts the portal host mounts too.
  test('component-backed block widget builds and mounts on first render', async ({ expect }) => {
    let widgets: WidgetState[] = [];
    const view = createView(
      '# Title\n\nsee [x](echo:///123)\n\n![label](echo:///456)\n',
      { link: recording, image: { Component: () => null } },
      (next) => (widgets = next),
    );
    forceParsing(view, view.state.doc.length, 5_000);
    await flush();
    expect(decorations(view).some((decoration) => decoration.block)).toBe(true);
    expect(widgets.map((widget) => widget.id)).toContain('cm-url-echo:///456-0');
    // DOM attachment is not asserted: happy-dom lays out no viewport, so CM defers drawing the
    // block host here; the storybook `MarkdownEditor — WithEmbed` story covers the drawn path.
    expect(widgets[0]?.root).toBeInstanceOf(HTMLElement);
    view.destroy();
  });
});

describe('objectLinks with a streaming tail', () => {
  test('a tail that starts before a matched link builds in order and claims the link', async ({ expect }) => {
    // The tail starts in the first paragraph; the walk has already matched the link in the second.
    const doc = '<reasoning>still arriving\n\nSee [DXOS](echo:///123) later.';
    const parent = document.createElement('div');
    const view = new EditorView({
      state: EditorState.create({
        doc,
        extensions: [
          extendedMarkdown({ registry: {} }),
          widgetHost({}),
          xmlTags({ registry: { reasoning: { streaming: true, factory: () => null } } }),
          objectLinks({ link: recording }),
        ],
      }),
      parent,
    });
    const found = await rebuild(view);
    expect(found.map(({ tag, from }) => ({ tag, from }))).toEqual([{ tag: 'reasoning', from: 0 }]);
    view.destroy();
  });
});
