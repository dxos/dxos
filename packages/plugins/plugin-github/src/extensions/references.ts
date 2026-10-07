//
// Copyright 2026 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { type Extension, type Range } from '@codemirror/state';
import { Decoration, type DecorationSet, type EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

/** `#123` — a GitHub issue or pull-request reference. GitHub itself caps numbers well below this. */
const REFERENCE = /(^|[^\w#/])#(\d{1,9})\b/g;

/**
 * Nodes whose text is not prose: a `#` inside them is a fragment, a colour, or code — never a
 * reference. A heading is deliberately absent: `## Notes on #123` is prose after the marker.
 */
const OPAQUE_NODES = new Set(['InlineCode', 'CodeText', 'FencedCode', 'CodeBlock', 'URL', 'Link', 'Autolink']);

export type GitHubReferenceResolver = (number: number) => string | undefined;

export type GitHubReferencesOptions = {
  /**
   * Target for a reference, or `undefined` to leave it undecorated — which is the answer whenever
   * the repository is unknown, since `#123` means nothing without one.
   */
  resolve: GitHubReferenceResolver;
};

/**
 * Decorates `#123` as a link to the issue or pull request.
 *
 * Contributed by this plugin rather than built into the editor: the number resolves against the
 * repository the space is bound to, which is GitHub-specific knowledge, and a document with no
 * GitHub binding must render the text unchanged.
 */
export const githubReferences = ({ resolve }: GitHubReferencesOptions): Extension =>
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = build(view, resolve);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = build(update.view, resolve);
        }
      }
    },
    {
      decorations: (instance) => instance.decorations,
    },
  );

/** Only the visible ranges: a long document would otherwise re-scan in full on every keystroke. */
const build = (view: EditorView, resolve: GitHubReferenceResolver): DecorationSet => {
  const ranges: Range<Decoration>[] = [];
  const tree = syntaxTree(view.state);
  for (const { from, to } of view.visibleRanges) {
    const text = view.state.sliceDoc(from, to);
    REFERENCE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = REFERENCE.exec(text))) {
      const start = from + match.index + match[1].length;
      const end = start + match[2].length + 1;
      if (isOpaque(tree, start)) {
        continue;
      }
      const url = resolve(Number(match[2]));
      if (!url) {
        continue;
      }
      ranges.push(
        Decoration.mark({
          tagName: 'a',
          attributes: { class: 'cm-link', href: url, rel: 'noreferrer', target: '_blank' },
        }).range(start, end),
      );
    }
  }

  return Decoration.set(ranges, true);
};

const isOpaque = (tree: ReturnType<typeof syntaxTree>, position: number): boolean => {
  let node = tree.resolveInner(position, 1);
  while (node.parent) {
    if (OPAQUE_NODES.has(node.name)) {
      return true;
    }
    node = node.parent;
  }
  return OPAQUE_NODES.has(node.name);
};

/**
 * The canonical target for a reference. `issues/<n>` is deliberate: GitHub redirects it to the pull
 * request when the number is one, so a single URL serves both without asking which it is.
 */
export const referenceUrl = (repo: string, number: number): string => `https://github.com/${repo}/issues/${number}`;
