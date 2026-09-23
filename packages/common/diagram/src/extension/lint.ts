//
// Copyright 2026 DXOS.org
//

import { type Diagnostic, linter } from '@codemirror/lint';
import { type Extension } from '@codemirror/state';
import { type EditorView } from '@codemirror/view';

import * as Diagnostics from '../diagnostics.ts';
import { parse, toScene } from '../dsl/parse.ts';

export type LintOptions = {
  /**
   * Also report the layout diagnostics — overlaps, a connector through a node, a label that does
   * not fit. Off by default because a document being typed is briefly nonsense; the bench and the
   * agent loop both want it on.
   */
  layout?: boolean;
};

/**
 * What is wrong with a document: everything `parse` found, and optionally everything
 * `Diagnostics.analyze` finds in the scene it produced, each carrying the range of the statement
 * or element that produced it — a layout error is only actionable when it points at the box it is
 * about. Separate from the CodeMirror wrapper so it needs no editor, which is also how the
 * agent-facing path reports the same problems.
 */
export const diagramDiagnostics = (text: string, { layout = false }: LintOptions = {}): Diagnostic[] => {
  const { commands, problems, ranges } = parse(text);
  const clamp = (value: number) => Math.max(0, Math.min(value, text.length));

  const diagnostics: Diagnostic[] = problems.map(({ severity, message, from, to }) => ({
    severity,
    message,
    from: clamp(from),
    to: clamp(to),
  }));

  // A document with a syntax error has a scene that is missing pieces, so its layout report would
  // be noise on top of an error the author is already fixing.
  if (layout && !problems.some(({ severity }) => severity === 'error')) {
    for (const diagnostic of Diagnostics.analyze(toScene(commands).objects).diagnostics) {
      const range = diagnostic.refs.flatMap((ref) => ranges.get(ref) ?? []).at(0);
      diagnostics.push({
        severity: diagnostic.severity,
        source: diagnostic.code,
        message: diagnostic.message,
        from: clamp(range?.from ?? 0),
        to: clamp(range?.to ?? Math.min(1, text.length)),
      });
    }
  }

  return diagnostics.sort((left, right) => left.from - right.from);
};

/** The CodeMirror linter over {@link diagramDiagnostics}. */
export const diagramLint = (options: LintOptions = {}): Extension =>
  linter((view: EditorView): Diagnostic[] => diagramDiagnostics(view.state.doc.toString(), options));
