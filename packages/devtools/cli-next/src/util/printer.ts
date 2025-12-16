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
  static of(props: FormBuilderOptions) {
    return new FormBuilder(props);
  }

  private readonly _title?: string;
  private readonly _prefix: string;
  private readonly _level: number;

  private readonly _entries: Array<{ key: string; value: Doc.Doc<any> }> = [];

  constructor({ title, prefix = '- ', level = 0 }: FormBuilderOptions = {}) {
    this._title = title;
    this._prefix = prefix;
    this._level = level;
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
    value: T | ((builder: FormBuilder) => Doc.Doc<any> | undefined) | undefined;
    color?: Ansi.Ansi | ((value: T) => Ansi.Ansi);
  }) {
    let genValue: any = value;
    if (typeof value === 'function') {
      genValue = (value as any)(this);
      if (Doc.isEmpty(genValue)) {
        return this;
      }
    }

    if (genValue !== undefined) {
      // Check if value is a Doc (approximately).
      const isDoc = typeof genValue === 'object' && genValue !== null && '_tag' in genValue;
      let valueDoc = isDoc ? (genValue as Doc.Doc<any>) : Doc.text(String(genValue));

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

  /**
   * Returns a child builder with increased level.
   */
  child() {
    return FormBuilder.of({ level: this._level + 1 });
  }

  build(): Doc.Doc<any> {
    const maxKeyLen = Math.max(0, ...this._entries.map((e) => e.key.length));
    const targetWidth = this._prefix.length + maxKeyLen + 2;
    const indent = Doc.text(' '.repeat(this._level * 2));
    const lines: Doc.Doc<any>[] = [];

    if (this._title) {
      lines.push(Doc.hcat([indent, Doc.annotate(Doc.text(this._title), Ansi.combine(Ansi.bold, Ansi.cyan))]));
    }

    lines.push(
      ...this._entries.map(({ key, value }) =>
        Doc.hcat([
          indent,
          Doc.annotate(Doc.fill(targetWidth)(Doc.text(this._prefix + key + ': ')), Ansi.blackBright),
          value,
        ]),
      ),
    );

    return Doc.vsep(lines);
  }
}
