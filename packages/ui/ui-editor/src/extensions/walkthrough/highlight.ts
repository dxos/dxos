//
// Copyright 2026 DXOS.org
//

import { HighlightStyle, LanguageDescription, type LanguageSupport } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { type Highlighter, highlightCode } from '@lezer/highlight';
import { vscodeDarkStyle, vscodeLightStyle } from '@uiw/codemirror-theme-vscode';

/**
 * The editor's own code colours (see `createBasicExtensions`), so a chunk reads exactly as the same
 * code does in an editor. Both modules are mounted, so the caller picks one by the editor's
 * `darkTheme`: a style's `themeType` is only honoured through `syntaxHighlighting`, not by its rules.
 */
export const diffHighlightStyles: Record<'dark' | 'light', HighlightStyle> = {
  dark: HighlightStyle.define(vscodeDarkStyle),
  light: HighlightStyle.define(vscodeLightStyle),
};

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
 * A chunk is a window into a file, and one that opens inside a declaration parses as top-level
 * statements: a type's members come out as bare variable names, uncoloured. `context` — the enclosing
 * line git names in the hunk header — is parsed ahead of the code and dropped from the result, so the
 * chunk is read inside the construct it belongs to.
 *
 * Resolves `undefined` when the language is unknown, leaving the caller's plain text in place.
 */
export const highlightLines = async (
  code: string,
  language: string,
  context?: string,
  highlighter: Highlighter | readonly Highlighter[] = diffHighlightStyles.light,
): Promise<DocumentFragment[] | undefined> => {
  const support = await loadLanguage(language);
  if (!support) {
    return undefined;
  }

  const prefix = context ? `${context}\n` : '';
  const source = prefix + code;
  const tree = support.language.parser.parse(source);
  const lines: DocumentFragment[] = [document.createDocumentFragment()];
  highlightCode(
    source,
    tree,
    highlighter,
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

  return prefix ? lines.slice(1) : lines;
};
