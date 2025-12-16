//
// Copyright 2025 DXOS.org
//

import * as Doc from '@effect/printer/Doc';
import * as Ansi from '@effect/printer-ansi/Ansi';
import * as AnsiDoc from '@effect/printer-ansi/AnsiDoc';

/**
 * Pretty prints a list of documents with ANSI colors.
 */
export const printList = (items: Array<Doc.Doc<any>>) =>
  AnsiDoc.render(Doc.vsep(items.map((item) => Doc.cat(item, Doc.hardLine))), { style: 'pretty' });

export type FormBuilderOptions = {
  title?: string;
  prefix?: string;
};

/**
 * Builds vertical form documents.
 */
export class FormBuilder {
  static of({ title, prefix = '- ' }: FormBuilderOptions) {
    return new FormBuilder({ title, prefix });
  }

  private _title?: string;
  private _prefix: string;
  private _entries: Array<{ key: string; value: any; color?: Ansi.Ansi | ((value: any) => Ansi.Ansi) }> = [];

  constructor({ title, prefix = '- ' }: FormBuilderOptions) {
    this._prefix = prefix;
    this._title = title;
  }

  set<T>({ key, value, color }: { key: string; value: T | undefined; color?: Ansi.Ansi | ((value: T) => Ansi.Ansi) }) {
    if (value !== undefined) {
      this._entries.push({ key, value, color });
    }

    return this;
  }

  build(): Doc.Doc<any> {
    const maxKeyLen = Math.max(0, ...this._entries.map((e) => e.key.length));
    const targetWidth = this._prefix.length + maxKeyLen + 2;

    const lines = this._entries.map(({ key, value, color }) =>
      Doc.cat(
        Doc.annotate(Doc.fill(targetWidth)(Doc.text(this._prefix + key + ': ')), Ansi.blackBright),
        color
          ? Doc.annotate(Doc.text(String(value)), typeof color === 'function' ? color(value) : color)
          : Doc.text(String(value)),
      ),
    );

    return Doc.vsep(
      this._title ? [Doc.annotate(Doc.text(this._title), Ansi.combine(Ansi.bold, Ansi.cyan)), ...lines] : lines,
    );
  }
}
