//
// Copyright 2026 DXOS.org
//

import { Mermaid, MermaidEngine, type Scene } from '@dxos/diagram';

/**
 * Prepares `display.mermaid` sources for plugin-illustrator's engine (`@dxos/diagram`), which lays
 * out the flowchart subset of Mermaid and nothing else. Kept free of DOM and framework code so the
 * worker and the unit tests share it.
 */

export type Prepared =
  | { readonly kind: 'flowchart'; readonly source: string }
  /** `type` is the source's first keyword, such as `sequenceDiagram`. */
  | { readonly kind: 'unsupported'; readonly type: string };

const HEADER = /^(?:flowchart|graph)\b/;

const ARROW = /\s*(o-->|--\|>|\.\.\|>|--\{|-->|---|-\.->|==>)\s*(\|[^|]*\|)?\s*/;

/** Splits on `;` outside brackets and quotes, since a label may contain one. */
const statements = (line: string): string[] => {
  const parts: string[] = [];
  let depth = 0;
  let quoted = false;
  let current = '';
  for (const char of line) {
    if (char === '"') {
      quoted = !quoted;
    } else if (!quoted && '[({'.includes(char)) {
      depth++;
    } else if (!quoted && '])}'.includes(char)) {
      depth = Math.max(0, depth - 1);
    } else if (char === ';' && !quoted && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  return [...parts, current].map((part) => part.trim()).filter((part) => part.length > 0);
};

/** `A --> B --> C` becomes one edge per line, because the parser reads a single edge per line. */
const unchain = (statement: string): string[] => {
  const tokens = statement.split(ARROW);
  // `split` with two capture groups yields [node, arrow, label, node, arrow, label, node, …].
  if (tokens.length < 7) {
    return [statement];
  }
  const edges: string[] = [];
  for (let index = 0; index + 3 < tokens.length; index += 3) {
    edges.push(`${tokens[index]} ${tokens[index + 1]}${tokens[index + 2] ?? ''} ${tokens[index + 3]}`);
  }
  return edges;
};

/**
 * Normalizes what a model commonly writes — `graph TD;`, `;`-separated statements, chained edges —
 * into the one-statement-per-line form the parser reads; other kinds are reported, not guessed at.
 */
export const prepare = (source: string): Prepared => {
  const lines = source
    .split('\n')
    .flatMap((line) => (line.trim().startsWith('%%') ? [line.trim()] : statements(line)))
    .flatMap((line) => (line.startsWith('%%') ? [line] : unchain(line)));
  const header = lines.find((line) => !line.startsWith('%%'));
  if (!header || !HEADER.test(header)) {
    return { kind: 'unsupported', type: header?.split(/\s/)[0] ?? 'empty' };
  }
  return { kind: 'flowchart', source: lines.join('\n') };
};

/**
 * Lays a prepared flowchart out with the illustrator's ELK engine and returns the world objects
 * `SceneSvg` draws. Unparsed lines are ignored by the parser, so an empty graph is the only failure
 * it can report and is raised here rather than rendered as a blank panel.
 */
export const layout = async (source: string): Promise<Scene.WorldObject[]> => {
  if (Mermaid.parse(source).nodes.length === 0) {
    throw new Error('The illustrator found no nodes in this flowchart.');
  }
  const commands = await MermaidEngine.compile(source);
  return commands.flatMap((command) => (command.op === 'upsert-object' ? [command.object] : []));
};
