//
// Copyright 2026 DXOS.org
//

import { type EditorView } from '@codemirror/view';

import { type SourceKey, formatSourceKey, parseSourceKey } from '#sync';

import { declarationSnippet } from '../CodeView/symbol.ts';
import { type WalkthroughStep } from '../SpecModel/index.ts';
import { mountSnippet } from './snippet-view.ts';

/** The text of the file a key names, when the checkout has it. */
export type SourceReader = (key: SourceKey) => string | undefined;

/** A rendered card and the release of the code views inside it. */
export type SnippetCard = { dom: HTMLElement; destroy: () => void };

export type SnippetCardOptions = {
  read?: SourceReader;
  onOpen?: (key: SourceKey) => void;
  /** Picks the highlight palette that matches the host editor. */
  dark?: boolean;
};

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

/** One file's excerpt: its name (a link to the file) above the highlighted declaration the key names. */
const snippetBlock = (key: SourceKey, { read, onOpen, dark = false }: SnippetCardOptions, views: EditorView[]) => {
  const block = element('div', 'flex flex-col gap-1');
  const name = element(
    onOpen ? 'button' : 'span',
    'self-start text-start break-all font-mono text-xs text-description hover:underline',
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
    const code = element('div', 'overflow-x-auto');
    code.dataset.testid = 'spec-review.snippet';
    views.push(mountSnippet(code, snippet, key.path, dark));
    block.appendChild(code);
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

const card = (testId: string): { root: HTMLElement; views: EditorView[]; done: () => SnippetCard } => {
  const root = element('div', 'flex flex-col gap-2 p-2 max-w-[40rem] max-h-[24rem] overflow-y-auto');
  root.dataset.testid = testId;
  const views: EditorView[] = [];
  return { root, views, done: () => ({ dom: root, destroy: () => views.forEach((view) => view.destroy()) }) };
};

/** The hover card of a code or test chip: the file name and the declaration. */
export const snippetCard = (key: SourceKey, options: SnippetCardOptions = {}): SnippetCard => {
  const { root, views, done } = card('spec-review.snippet-card');
  root.appendChild(snippetBlock(key, options, views));
  return done();
};

/** The hover card of a status chip: each walkthrough step's sentence above its code. */
export const walkthroughCard = (steps: readonly WalkthroughStep[], options: SnippetCardOptions = {}): SnippetCard => {
  const { root, views, done } = card('spec-review.walkthrough-card');
  steps.forEach(({ text, key }, index) => {
    const parsed = parseSourceKey(key);
    const step = element('div', 'flex flex-col gap-1');
    if (text) {
      step.appendChild(element('p', 'm-0 text-sm', `${index + 1}. ${text}.`));
    }
    if (parsed) {
      step.appendChild(snippetBlock(parsed, options, views));
    }
    root.appendChild(step);
  });
  return done();
};
