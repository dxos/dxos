//
// Copyright 2026 DXOS.org
//

import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import { type AsyncBuffer, parquetMetadataAsync, parquetReadObjects } from 'hyparquet';
import { open } from 'node:fs/promises';

/** A decoded parquet row, keyed by column name. */
export type ParquetRow = Record<string, unknown>;

/** Failure opening, parsing, or decoding a parquet file; carries the offending path. */
export class ParquetReadError extends Data.TaggedError('ParquetReadError')<{
  readonly file: string;
  readonly cause: unknown;
}> {}

type RowGroupRange = { readonly rowStart: number; readonly rowEnd: number };

/**
 * A pipeline source over a set of parquet files. Emits decoded rows as a back-pressured stream, one
 * row group at a time, so decoded-row memory stays bounded regardless of file size. Files are read
 * in the given order; within a file, rows follow row-group order.
 */
export const parquetSource = (files: readonly string[]): Stream.Stream<ParquetRow, ParquetReadError> =>
  Stream.fromIterable(files).pipe(Stream.flatMap(fileRows, { concurrency: 1 }));

// Absolute [rowStart, rowEnd) ranges, one per row group; `num_rows` is a bigint in the metadata.
const rowGroupRanges = (metadata: Awaited<ReturnType<typeof parquetMetadataAsync>>): RowGroupRange[] => {
  const ranges: RowGroupRange[] = [];
  let rowStart = 0;
  for (const group of metadata.row_groups) {
    const rowEnd = rowStart + Number(group.num_rows);
    ranges.push({ rowStart, rowEnd });
    rowStart = rowEnd;
  }
  return ranges;
};

// One file's rows, decoded a row group at a time. The fs handle is scoped to the stream (opened on
// start, closed on completion/interruption via acquireRelease + unwrapScoped); the AsyncBuffer
// slices byte ranges on demand so only the bytes a row group needs are read.
const fileRows = (file: string): Stream.Stream<ParquetRow, ParquetReadError> =>
  Stream.unwrapScoped(
    Effect.gen(function* () {
      const handle = yield* Effect.acquireRelease(
        Effect.tryPromise({ try: () => open(file, 'r'), catch: (cause) => new ParquetReadError({ file, cause }) }),
        (handle) => Effect.promise(() => handle.close()),
      );
      const { size } = yield* Effect.tryPromise({
        try: () => handle.stat(),
        catch: (cause) => new ParquetReadError({ file, cause }),
      });
      const asyncBuffer: AsyncBuffer = {
        byteLength: size,
        slice: async (start, end = size) => {
          // Ranges hyparquet requests are always within [0, byteLength) (derived from the metadata),
          // so the read fills the whole view; no short-read handling is needed.
          const view = new Uint8Array(end - start);
          await handle.read(view, 0, view.byteLength, start);
          return view.buffer;
        },
      };
      const metadata = yield* Effect.tryPromise({
        try: () => parquetMetadataAsync(asyncBuffer),
        catch: (cause) => new ParquetReadError({ file, cause }),
      });
      return Stream.fromIterable(rowGroupRanges(metadata)).pipe(
        Stream.mapEffect((range) =>
          Effect.tryPromise({
            try: () =>
              parquetReadObjects({ file: asyncBuffer, metadata, rowStart: range.rowStart, rowEnd: range.rowEnd }),
            catch: (cause) => new ParquetReadError({ file, cause }),
          }),
        ),
        Stream.flattenIterables,
      );
    }),
  );
