//
// Copyright 2026 DXOS.org
//

/** An Emscripten ES module factory, as `wa-sqlite/dist/wa-sqlite.mjs` exports it. */
export type SqliteModuleFactory<T> = (config?: object) => Promise<T>;

/**
 * Bytes one native decoder may see before it is replaced: half of WebKit's `String::MaxLength`, so
 * even a maximal single string lands under the cap.
 */
export const DECODER_BYTE_BUDGET = 2 ** 30;

/**
 * Derives a `TextDecoder` class that hands each `decode` to a native instance and replaces that
 * instance before it has seen {@link DECODER_BYTE_BUDGET} bytes.
 *
 * WebKit's safari-7619 to safari-7621 branches (Safari 18) count bytes across every `decode` call
 * on one instance, streaming or not, and throw `RangeError: Bad value` on every call after the
 * total passes `String::MaxLength` (2^31 - 1), so a decoder that lives as long as the process
 * eventually refuses all input.
 */
export const makeBoundedTextDecoder = (Native: typeof TextDecoder, budget = DECODER_BYTE_BUDGET): typeof TextDecoder =>
  class BoundedTextDecoder extends Native {
    readonly #label: string | undefined;
    readonly #options: TextDecoderOptions | undefined;
    #inner: TextDecoder;
    #decodedBytes = 0;
    #streaming = false;

    constructor(label?: string, options?: TextDecoderOptions) {
      super(label, options);
      this.#label = label;
      this.#options = options;
      this.#inner = new Native(label, options);
    }

    override decode(input?: AllowSharedBufferSource, options?: TextDecodeOptions): string {
      const bytes = input?.byteLength ?? 0;
      // A decoder mid-stream holds the tail of a split sequence, so it is only replaced between calls.
      if (!this.#streaming && this.#decodedBytes + bytes > budget) {
        this.#inner = new Native(this.#label, this.#options);
        this.#decodedBytes = 0;
      }
      this.#decodedBytes += bytes;
      this.#streaming = options?.stream === true;
      return this.#inner.decode(input, options);
    }
  };

/**
 * Instantiates the wa-sqlite Emscripten module with a {@link makeBoundedTextDecoder} string decoder.
 *
 * Emscripten's glue constructs one `UTF8Decoder` from the global `TextDecoder` synchronously when
 * the factory is called and decodes every TEXT column, column name and VFS path through it for the
 * module's lifetime, so under Safari 18 a long-lived worker fails every query once 2 GiB of text has
 * been read (DX-1298). The global is swapped only for that synchronous call.
 */
export const instantiateSqliteModule = <T>(factory: SqliteModuleFactory<T>, config?: object): Promise<T> => {
  const Native = globalThis.TextDecoder;
  globalThis.TextDecoder = makeBoundedTextDecoder(Native);
  try {
    return factory(config);
  } finally {
    globalThis.TextDecoder = Native;
  }
};
