//
// Copyright 2026 DXOS.org
//

//
// The diagram rule library: what makes a drawing read well to a person, as `diagram-rule` blocks in
// `rules/DIAGRAM.mdl` (a term of its own, so the code-review harness, which reads `rule` blocks, never
// picks these up). Each rule names how it is judged: `code` rules are measured from the scene's
// geometry by `Appeal`, `vision` rules are asked of a decision model shown the rendered image, and
// `both` rules have a geometric measure that the image judge can be checked against.
//

import text from '../rules/DIAGRAM.mdl?raw';

export type Evaluator = 'code' | 'vision' | 'both';

export type Category = 'crossings' | 'flow' | 'alignment' | 'space' | 'groups' | 'labels' | 'edges' | 'hierarchy';

export type DiagramRule = {
  /** Kebab-case id; `Appeal`'s evaluators and the image judge's decision keys are derived from it. */
  readonly id: string;
  /** What a good diagram does, in one line. */
  readonly title: string;
  readonly category: Category;
  readonly evaluator: Evaluator;
  /** Relative importance in the overall appeal score; the research ranks crossings far above the rest. */
  readonly weight: number;
  /** The yes/no question a vision judge answers; `yes` means the drawing follows the rule. */
  readonly question?: string;
  readonly criteria?: { readonly true: string; readonly false: string };
  /** Rationale, the evidence behind the rule, and what does not count against it. */
  readonly prose: string;
};

const EVALUATORS: readonly Evaluator[] = ['code', 'vision', 'both'];
const CATEGORIES: readonly Category[] = [
  'crossings',
  'flow',
  'alignment',
  'space',
  'groups',
  'labels',
  'edges',
  'hierarchy',
];
const FIELDS = new Set(['category', 'evaluator', 'weight', 'question', 'yes', 'no']);

const isEvaluator = (value: string): value is Evaluator => (EVALUATORS as readonly string[]).includes(value);
const isCategory = (value: string): value is Category => (CATEGORIES as readonly string[]).includes(value);

/** The line arrays of every ```mdl fence in a document. */
const fences = (document: string): string[][] => {
  const blocks: string[][] = [];
  let block: string[] | undefined;
  for (const line of document.split(/\r?\n/)) {
    if (!block) {
      if (/^\s*```mdl\s*$/.test(line)) {
        block = [];
      }
    } else if (/^\s*```\s*$/.test(line)) {
      blocks.push(block);
      block = undefined;
    } else {
      block.push(line);
    }
  }
  return blocks;
};

/**
 * Parses the `diagram-rule` blocks of an `.mdl` document, ignoring every other block. A malformed rule
 * throws, naming it, since a rule that silently drops out would leave its evaluator unbound.
 */
export const parse = (document: string): DiagramRule[] =>
  fences(document).flatMap((lines) => {
    const start = lines.findIndex((line) => line.trim() !== '');
    const header = start >= 0 ? /^diagram-rule\s+([a-z0-9-]+)\s*:\s*(.+)$/.exec(lines[start].trim()) : null;
    if (!header) {
      return [];
    }
    const [, id, title] = header;
    const fields: Record<string, string> = {};
    const prose: string[] = [];
    for (const line of lines.slice(start + 1)) {
      const field = /^\s*([a-z]+)\s*:\s*(.*)$/.exec(line);
      if (field && FIELDS.has(field[1])) {
        fields[field[1]] = field[2].trim();
      } else {
        prose.push(line.trim());
      }
    }
    const { category = '', evaluator = '', weight = '1', question, yes, no } = fields;
    if (!isCategory(category) || !isEvaluator(evaluator) || !Number.isFinite(Number(weight))) {
      throw new Error(`diagram-rule ${id}: needs category (${CATEGORIES.join('|')}), evaluator and a numeric weight.`);
    }
    if (evaluator !== 'code' && !question) {
      throw new Error(`diagram-rule ${id}: a ${evaluator} rule needs a question for the image judge.`);
    }
    return [
      {
        id,
        title,
        category,
        evaluator,
        weight: Number(weight),
        ...(question ? { question } : {}),
        ...(yes && no ? { criteria: { true: yes, false: no } } : {}),
        prose: prose.join('\n').trim(),
      },
    ];
  });

/** Every rule in `rules/DIAGRAM.mdl`. */
export const RULES: readonly DiagramRule[] = parse(text);

/** The camelCase decision key a judge answers a rule under. */
export const keyOf = (id: string): string => id.replace(/-([a-z0-9])/g, (_, letter: string) => letter.toUpperCase());
