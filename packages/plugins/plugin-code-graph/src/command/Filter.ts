//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Iri } from '#graph';
import { type CodeGraph } from '#types';

/** A text filter matches every box. */
export const ALL = '*';

const KINDS = new Set<string>(['package', 'file', 'symbol', 'module', 'spec', 'other']);

/**
 * Compiles a remove filter into a predicate over boxes:
 * - `*` matches every box;
 * - `kind:<kind>` matches boxes of one kind (`kind:file`);
 * - `/pattern/flags` is a regular expression over the label and the IRI;
 * - anything else matches, ignoring case, a substring of the label, the IRI shorthand or the package group.
 *
 * Several filters separated by `|` match a box that any of them matches.
 */
export const compile = (filter: string): ((node: CodeGraph.Node) => boolean) => {
  const alternatives = splitAlternatives(filter.trim()).map(compileOne);
  return (node) => alternatives.some((matches) => matches(node));
};

/** The boxes a filter selects. */
export const select = (nodes: readonly CodeGraph.Node[], filter: string): CodeGraph.Node[] => {
  const matches = compile(filter);
  return nodes.filter(matches);
};

/** A regular expression's own `|` belongs to it, so only top-level `|` outside `/…/` separate alternatives. */
const splitAlternatives = (filter: string): string[] => {
  if (/^\/.*\/[a-z]*$/.test(filter)) {
    return [filter];
  }
  return filter
    .split('|')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
};

const compileOne = (filter: string): ((node: CodeGraph.Node) => boolean) => {
  if (filter === ALL) {
    return () => true;
  }
  const kind = /^kind:(\w+)$/i.exec(filter)?.[1]?.toLowerCase();
  if (kind && KINDS.has(kind)) {
    return (node) => node.kind === kind;
  }
  const regex = /^\/(.+)\/([a-z]*)$/.exec(filter);
  if (regex) {
    try {
      const pattern = new RegExp(regex[1], regex[2].replace('g', ''));
      return (node) => pattern.test(node.label) || pattern.test(Iri.compact(node.id));
    } catch {
      // An invalid expression from the model falls through to a literal match rather than failing the command.
    }
  }
  const needle = filter.toLowerCase();
  return (node) =>
    [node.label, Iri.compact(node.id), node.group ?? ''].some((text) => text.toLowerCase().includes(needle));
};
