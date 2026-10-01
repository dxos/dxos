//
// Copyright 2026 DXOS.org
//

import ts from '@typescript/typescript6';

import { type CodeFile, type Element } from '../code-file.ts';
import { addAttr, attrText, getAttr, removeAttr } from '../jsx.ts';
import { type Transform } from './transform.ts';

type Prop = [name: string, value: string | number | boolean];

/** A class token that maps onto a prop of the host, or is dropped as a no-op; undefined leaves it alone. */
type ClassRule = {
  token: RegExp;
  hosts: string[];
  prop: (match: RegExpMatchArray, host: string) => Prop | 'drop' | undefined;
  /** Report the token on any other react-ui host, since the prop exists only on `hosts`. */
  reportElsewhere?: boolean;
};

const ICON = ['Icon'];
const TEXT = ['Card.Title', 'Card.Text'];
const INPUT = ['Field.Input', 'Input'];
const SPAN = ['Field.Root', 'Fieldset.Root', 'Container'];
const DOCUMENT = ['Panel.Root', 'Container'];

/** The fixed rules of the `classNames` policy (AUDIT §7); everything else stays `classNames`. */
const RULES: ClassRule[] = [
  { token: /^shrink-0$/, hosts: ICON, prop: () => 'drop' },
  { token: /^text-(error|success|info|warning)-text$/, hosts: ICON, prop: (match) => ['valence', match[1]] },
  { token: /^text-(description|subdued)$/, hosts: ICON, prop: (match) => ['tone', match[1]] },
  { token: /^animate-spin$/, hosts: ICON, prop: () => ['spin', true] },
  { token: /^truncate$/, hosts: TEXT, prop: () => ['truncate', true] },
  {
    token: /^text-(description|subdued)$/,
    hosts: TEXT,
    prop: (match, host) =>
      host === 'Card.Text' ? (match[1] === 'description' ? ['variant', 'description'] : undefined) : ['tone', match[1]],
  },
  {
    token: /^line-clamp-(\d+)$/,
    hosts: ['Card.Title'],
    prop: (match) => ['lines', Number(match[1])],
    reportElsewhere: true,
  },
  { token: /^font-mono$/, hosts: INPUT, prop: () => ['variant', 'mono'] },
  {
    token: /^col-span-(\d+|full)$/,
    hosts: SPAN,
    prop: (match) => ['span', match[1] === 'full' ? 'full' : Number(match[1])],
    reportElsewhere: true,
  },
  { token: /^dx-document$/, hosts: DOCUMENT, prop: () => ['width', 'document'], reportElsewhere: true },
];

/** What one token becomes on `host`, or undefined when no rule applies. */
const convert = (token: string, host: string): Prop | 'drop' | undefined => {
  for (const rule of RULES) {
    const match = token.match(rule.token);
    const result = match && rule.hosts.includes(host) ? rule.prop(match, host) : undefined;
    if (result) {
      return result;
    }
  }
  return undefined;
};

const misplaced = (token: string, host: string) =>
  RULES.some((rule) => rule.reportElsewhere && rule.token.test(token) && !rule.hosts.includes(host));

const stringNodes = (node: ts.Node): (ts.StringLiteral | ts.NoSubstitutionTemplateLiteral)[] => {
  const result: (ts.StringLiteral | ts.NoSubstitutionTemplateLiteral)[] = [];
  const visit = (child: ts.Node) => {
    if (ts.isStringLiteral(child) || ts.isNoSubstitutionTemplateLiteral(child)) {
      result.push(child);
    }
    ts.forEachChild(child, visit);
  };
  visit(node);
  return result;
};

const quote = (node: ts.StringLiteral | ts.NoSubstitutionTemplateLiteral, file: CodeFile, value: string) => {
  const delimiter = node.getText(file.sourceFile)[0];
  return `${delimiter}${value}${delimiter}`;
};

/** Converts the tokens of `literal`, returning its remaining text, or undefined when nothing changed. */
const convertLiteral = (
  file: CodeFile,
  element: Element,
  host: string,
  literal: ts.StringLiteral | ts.NoSubstitutionTemplateLiteral,
  props: Map<string, string | number | boolean>,
): string | undefined => {
  const tokens = literal.text.split(/\s+/).filter(Boolean);
  const kept: string[] = [];
  let changed = false;
  for (const token of tokens) {
    const conversion = convert(token, host);
    if (!conversion) {
      if (misplaced(token, host)) {
        file.report(literal, `${token} on ${host}: the prop exists only on other hosts`);
      }
      kept.push(token);
      continue;
    }
    if (conversion !== 'drop') {
      const [name, value] = conversion;
      if (getAttr(element, name) || props.has(name)) {
        file.report(literal, `${token} on ${host}: ${name} is already set`);
        kept.push(token);
        continue;
      }
      props.set(name, value);
      file.count(`${host} ${token} → ${attrText(name, value)}`);
    } else {
      file.count(`${host} ${token} dropped`);
    }
    changed = true;
  }
  if (props.get('variant') === 'mono') {
    const index = kept.indexOf('tabular-nums');
    if (index !== -1) {
      kept.splice(index, 1);
      changed = true;
    }
  }
  return changed ? kept.join(' ') : undefined;
};

const transformElement = (file: CodeFile, element: Element) => {
  const attr = getAttr(element, 'classNames');
  if (!attr?.initializer) {
    return;
  }
  const host = element.identity.path.join('.');
  const props = new Map<string, string | number | boolean>();
  const init = attr.initializer;
  const expression = ts.isJsxExpression(init) ? init.expression : init;
  if (!expression) {
    return;
  }

  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    const rest = convertLiteral(file, element, host, expression, props);
    if (rest === undefined) {
      return;
    }
    if (rest.length === 0) {
      removeAttr(file, attr);
    } else {
      file.replace(expression, quote(expression, file, rest));
    }
  } else if (ts.isCallExpression(expression) || ts.isArrayLiteralExpression(expression)) {
    const args = ts.isCallExpression(expression) ? expression.arguments : expression.elements;
    let changed = false;
    const remaining: string[] = [];
    for (const arg of args) {
      if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) {
        const rest = convertLiteral(file, element, host, arg, props);
        if (rest !== undefined) {
          changed = true;
          if (rest.length > 0) {
            remaining.push(quote(arg, file, rest));
          }
          continue;
        }
      } else {
        reportDynamic(file, host, arg);
      }
      remaining.push(arg.getText(file.sourceFile));
    }
    if (!changed) {
      return;
    }
    if (remaining.length === 0) {
      removeAttr(file, attr);
    } else if (ts.isCallExpression(expression)) {
      file.replace(expression, `${expression.expression.getText(file.sourceFile)}(${remaining.join(', ')})`);
    } else {
      file.replace(expression, `[${remaining.join(', ')}]`);
    }
  } else {
    reportDynamic(file, host, expression);
  }

  for (const [name, value] of props) {
    addAttr(file, element, attrText(name, value));
  }
};

/** Rule tokens inside a conditional or computed part: a person decides (`busy ? 'animate-spin' : ''` → `spin={busy}`). */
const reportDynamic = (file: CodeFile, host: string, node: ts.Node) => {
  for (const literal of stringNodes(node)) {
    for (const token of literal.text.split(/\s+/).filter(Boolean)) {
      if (convert(token, host)) {
        file.report(literal, `${token} on ${host} inside a computed classNames`);
      }
    }
  }
};

export const classnames: Transform = {
  name: 'classnames',
  description:
    'The fixed classNames rules: Icon valence/tone/spin, text truncate/tone/lines, mono input, span, document width.',
  applies: (text) => text.includes('classNames'),
  run: (file) => {
    for (const element of file.elements()) {
      if (element.identity.pkg === 'react-ui') {
        transformElement(file, element);
      }
    }
  },
};
