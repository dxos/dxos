//
// Copyright 2026 DXOS.org
//

import { LanguageDescription, type LanguageSupport } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { classHighlighter, highlightCode } from '@lezer/highlight';

/** Resolved supports, so a document with many blocks in one language loads its parser once. */
const loaded = new Map<string, Promise<LanguageSupport | undefined>>();

const loadLanguage = (name: string): Promise<LanguageSupport | undefined> => {
  let pending = loaded.get(name);
  if (!pending) {
    const description = LanguageDescription.matchLanguageName(languages, name, true);
    // Cached as a rejection-free promise: one unknown language must not break the next lookup.
    pending = description ? Promise.resolve(description.load()).catch(() => undefined) : Promise.resolve(undefined);
    loaded.set(name, pending);
  }

  return pending;
};

/**
 * Syntax-highlights `code` and returns one fragment per line, ready to drop into the cells of a
 * rendered diff. The whole side is parsed at once rather than line by line, so multi-line constructs
 * (a block comment, a template literal) are coloured as the constructs they are; Lezer's error
 * recovery covers the fact that a chunk is not a whole file.
 *
 * Resolves `undefined` when the language is unknown, leaving the caller's plain text in place.
 */
export const highlightLines = async (code: string, language: string): Promise<DocumentFragment[] | undefined> => {
  const support = await loadLanguage(language);
  if (!support) {
    return undefined;
  }

  const tree = support.language.parser.parse(code);
  const lines: DocumentFragment[] = [document.createDocumentFragment()];
  highlightCode(
    code,
    tree,
    classHighlighter,
    (text, classes) => {
      const line = lines[lines.length - 1];
      if (!classes) {
        line.appendChild(document.createTextNode(text));
        return;
      }
      const span = document.createElement('span');
      span.className = classes;
      span.textContent = text;
      line.appendChild(span);
    },
    () => lines.push(document.createDocumentFragment()),
  );

  return lines;
};
