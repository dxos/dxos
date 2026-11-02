//
// Copyright 2026 DXOS.org
//

import { type Extension, type Range } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import { findSpecRefs, specDependencies, specReferenceFilter } from '@dxos/deus/extension';
import { type SourceKey, findSourceKeys } from '@dxos/deus/review';
import { type SpecIndex, frontmatter } from '@dxos/deus/spec-index';

import { resolveSpecRef } from './spec-ref.ts';

/** A span of the spec that names another spec or file: openable, or broken with the reason. */
export type SourceLink = { from: number; to: number } & ({ target: SourceKey } | { error: string });

const LINK = Decoration.mark({
  class: 'underline decoration-dotted underline-offset-2 text-accent-text cursor-pointer',
  attributes: { 'title': 'Ctrl/⌘-click to open', 'data-testid': 'spec-editor.source-link' },
});

const brokenLink = (error: string): Decoration =>
  Decoration.mark({
    class: 'line-through decoration-error-text text-error-text cursor-help',
    attributes: { 'title': error, 'data-testid': 'spec-editor.broken-link' },
  });

/**
 * Every link in a spec: `github:` keys, and, given the index, `<spec id>#<item>` references and `uses`/`dependsOn`
 * ids. Sorted by position; a span overlapping an earlier one is dropped.
 */
export const findSourceLinks = (text: string, index?: SpecIndex): SourceLink[] => {
  const links: SourceLink[] = findSourceKeys(text).map(({ from, to, key }) => ({ from, to, target: key }));
  if (index) {
    const isReference = specReferenceFilter(index);
    const selfId = frontmatter(text).id;
    const resolve = (from: number, to: number, id: string, item?: string): SourceLink => {
      const resolved = resolveSpecRef(index, id, item);
      return 'error' in resolved ? { from, to, error: resolved.error } : { from, to, target: resolved };
    };
    for (const { id, item, from, to } of findSpecRefs(text)) {
      if (!isReference(id)) {
        continue;
      }
      const link = resolve(from, to, id, item);
      // The lint does not check references into the spec itself, which may not be indexed yet.
      if (id !== selfId || 'target' in link) {
        links.push(link);
      }
    }
    for (const { id, from, to } of specDependencies(text)) {
      links.push(resolve(from, to, id));
    }
  }
  let end = -1;
  return links
    .sort((left, right) => left.from - right.from)
    .filter((link) => {
      if (link.from < end) {
        return false;
      }
      end = link.to;
      return true;
    });
};

const decorate = (links: SourceLink[]): DecorationSet =>
  Decoration.set(
    links.map((link): Range<Decoration> =>
      ('target' in link ? LINK : brokenLink(link.error)).range(link.from, link.to),
    ),
  );

/**
 * Underlines every `github:` key, `<spec id>#<item>` reference and dependency id in the spec and opens it on
 * Ctrl/⌘-click (the IDE gesture for go-to-definition), so a spec reads as a hyperlinked map of the specs and code it
 * names. A reference the index cannot resolve is struck through, with the lint message on hover.
 */
export const sourceLinks = (onOpen: (key: SourceKey) => void, index?: SpecIndex): Extension => {
  const plugin = ViewPlugin.fromClass(
    class {
      links: SourceLink[];
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.links = findSourceLinks(view.state.doc.toString(), index);
        this.decorations = decorate(this.links);
      }

      update(update: ViewUpdate) {
        if (update.docChanged) {
          this.links = findSourceLinks(update.state.doc.toString(), index);
          this.decorations = decorate(this.links);
        }
      }
    },
    { decorations: (value) => value.decorations },
  );

  return [
    plugin,
    EditorView.domEventHandlers({
      mousedown: (event, view) => {
        if (!(event.ctrlKey || event.metaKey) || event.button !== 0) {
          return false;
        }
        const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
        const link =
          pos !== null ? view.plugin(plugin)?.links.find(({ from, to }) => pos >= from && pos <= to) : undefined;
        if (!link || !('target' in link)) {
          return false;
        }
        event.preventDefault();
        onOpen(link.target);
        return true;
      },
    }),
  ];
};
