//
// Copyright 2026 DXOS.org
//

import { type SourceKey, formatSourceKey, parseSourceKey } from '#sync';

import { declarationSnippet } from '../CodeView/symbol.ts';
import { type WalkthroughStep } from '../SpecModel/index.ts';

/** The text of the file a key names, when the checkout has it. */
export type SourceReader = (key: SourceKey) => string | undefined;

const element = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
};

/** One file's excerpt: its name (a link to the file) above the declaration the key names. */
const snippetBlock = (key: SourceKey, read: SourceReader | undefined, onOpen?: (key: SourceKey) => void) => {
  const block = element('div', 'flex flex-col gap-1');
  const name = element(
    onOpen ? 'button' : 'span',
    'self-start font-mono text-xs text-description hover:underline',
    `${key.path}${key.fragment ? `#${key.fragment}` : ''}`,
  );
  name.title = formatSourceKey(key);
  if (onOpen) {
    name.setAttribute('type', 'button');
    name.addEventListener('click', () => onOpen(key));
  }
  block.appendChild(name);

  const text = read?.(key);
  const snippet = text === undefined ? undefined : declarationSnippet(text, key.fragment);
  if (snippet) {
    const pre = element('pre', 'm-0 overflow-x-auto text-xs leading-5 font-mono');
    pre.dataset.testid = 'spec-review.snippet';
    snippet.lines.forEach((line, index) => {
      const row = element('div', 'flex');
      row.appendChild(
        element('span', 'w-8 shrink-0 pe-2 text-end text-description select-none', String(snippet.line + index)),
      );
      row.appendChild(element('span', 'whitespace-pre', line));
      pre.appendChild(row);
    });
    if (snippet.truncated) {
      pre.appendChild(element('div', 'ps-8 text-description', '…'));
    }
    block.appendChild(pre);
  } else {
    // No checkout, or the symbol moved: the name alone still links to the file.
    block.appendChild(
      element(
        'span',
        'text-xs text-description',
        text === undefined ? 'Not in a local checkout.' : 'Symbol not found.',
      ),
    );
  }
  return block;
};

const card = (testId: string): HTMLElement => {
  const root = element('div', 'flex flex-col gap-2 p-2 max-w-[40rem] max-h-[24rem] overflow-y-auto');
  root.dataset.testid = testId;
  return root;
};

/** The hover card of a code or test chip: the file name and the declaration. */
export const snippetCard = (key: SourceKey, read?: SourceReader, onOpen?: (key: SourceKey) => void): HTMLElement => {
  const root = card('spec-review.snippet-card');
  root.appendChild(snippetBlock(key, read, onOpen));
  return root;
};

/** The hover card of a status chip: each walkthrough step's sentence above its code. */
export const walkthroughCard = (
  steps: readonly WalkthroughStep[],
  read?: SourceReader,
  onOpen?: (key: SourceKey) => void,
): HTMLElement => {
  const root = card('spec-review.walkthrough-card');
  steps.forEach(({ text, key }, index) => {
    const parsed = parseSourceKey(key);
    const step = element('div', 'flex flex-col gap-1');
    if (text) {
      step.appendChild(element('p', 'm-0 text-sm', `${index + 1}. ${text}.`));
    }
    if (parsed) {
      step.appendChild(snippetBlock(parsed, read, onOpen));
    }
    root.appendChild(step);
  });
  return root;
};
