//
// Copyright 2026 DXOS.org
//

/** A value in an MDL block body: a scalar, a list, or a map. */
export type MdlValue = string | number | boolean | null | MdlValue[] | MdlMap;

export type MdlMap = { [key: string]: MdlValue };

/** One block: the header line `<type> [<id>][: <title>]` and its indented fields. */
export type MdlBlock = {
  type: string;
  id?: string;
  title?: string;
  fields: MdlMap;
  /** Zero-based line of the header in the source. */
  line: number;
};

/** Raised for malformed MDL; `line` is zero-based. */
export class MdlSyntaxError extends Error {
  constructor(
    message: string,
    readonly line: number,
    readonly column = 0,
  ) {
    super(`${message} (line ${line + 1})`);
    this.name = 'MdlSyntaxError';
  }
}
