//
// Copyright 2025 DXOS.org
//

import * as Doc from '@effect/printer/Doc';
import * as Ansi from '@effect/printer-ansi/Ansi';
import * as AnsiDoc from '@effect/printer-ansi/AnsiDoc';

/**
 * Pretty print document.
 */
export const print = (doc: Doc.Doc<any>) => AnsiDoc.render(doc, { style: 'pretty' });

/**
 * Pretty prints a list of documents with ANSI colors.
 */
export const printList = (items: Array<Doc.Doc<any>>) =>
  AnsiDoc.render(Doc.vsep(items.map((item) => Doc.cat(item, Doc.hardLine))), { style: 'pretty' });

export type FormBuilderOptions = {
  title?: string;
  prefix?: string;
  level?: number;
};

/**
 * Builds vertical form documents.
 */
export class FormBuilder {
  static of(props?: FormBuilderOptions) {
    return new FormBuilder(props);
  }

  private readonly _title?: string;
  private readonly _prefix: string;

  private readonly _entries: Array<{ key: string; value: Doc.Doc<any> }> = [];

  constructor({ title, prefix = '- ' }: FormBuilderOptions = {}) {
    this._title = title;
    this._prefix = prefix;
  }

  /**
   * Set key (if value !== undefined).
   */
  set<T>({
    key,
    value,
    color,
  }: {
    key: string;
    value: T | FormBuilder | ((builder: FormBuilder) => Doc.Doc<any> | undefined) | undefined;
    color?: Ansi.Ansi | ((value: T) => Ansi.Ansi);
  }) {
    if (value !== undefined) {
      let valueDoc: Doc.Doc<any>;
      if (value instanceof FormBuilder) {
        // Handle nested FormBuilder by building it with increased level.
        valueDoc = value.build(1);
      } else if (typeof value === 'function') {
        const result = (value as any)(new FormBuilder({ level: 1 }));
        if (!result) {
          return this;
        }

        valueDoc = result;
      } else if (typeof value === 'object' && value !== null) {
        valueDoc = value as unknown as Doc.Doc<any>;
      } else {
        valueDoc = Doc.text(String(value));
      }

      if (color) {
        const ansi = typeof color === 'function' ? color(value as T) : color;
        valueDoc = Doc.annotate(valueDoc, ansi);
      }

      this._entries.push({ key, value: valueDoc });
    }

    return this;
  }

  /**
   * Set key for each value (if value !== undefined).
   */
  each<T>(values: T[], fn: (value: T, builder: FormBuilder) => void) {
    values.forEach((value) => fn(value, this));
    return this;
  }

  build(level = 0): Doc.Doc<any> {
    const maxKeyLen = Math.max(0, ...this._entries.map((entry) => entry.key.length));
    const targetWidth = this._prefix.length + maxKeyLen + 2;
    const lines: Doc.Doc<any>[] = [];

    if (this._title) {
      lines.push(Doc.hcat([Doc.annotate(Doc.text(this._title), Ansi.combine(Ansi.bold, Ansi.cyan))]));
    }

    const indent = Doc.text(' '.repeat(level * 2));
    this._entries.forEach(({ key, value }) => {
      const keyLine = Doc.hcat([
        indent,
        Doc.annotate(Doc.fill(targetWidth)(Doc.text(this._prefix + key + ': ')), Ansi.blackBright),
      ]);

      // Check if value is a multi-line doc (from nested FormBuilder).
      // We detect this by checking if it contains line breaks.
      const valueStr = AnsiDoc.render(value, { style: 'pretty' });
      if (valueStr.includes('\n')) {
        // Multi-line value: render key on its own line, then the nested content.
        lines.push(keyLine);
        lines.push(value);
      } else {
        // Single-line value: render inline.
        lines.push(Doc.hcat([keyLine, value]));
      }
    });

    return Doc.vsep(lines);
  }
}
