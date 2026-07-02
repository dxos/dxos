//
// Copyright 2026 DXOS.org
//

/**
 * Context handed to a bundled extractor. Runs in the content-script world of
 * the target page.
 */
export type ExtractorContext = {
  document: Document;
  /** Descriptor-supplied parameters (validated by the extractor itself). */
  params?: unknown;
};

/**
 * A bundled input extractor referenced by page-action descriptors by name.
 * Output is validated Composer-side by the target operation's input schema.
 */
export type Extractor<T = unknown> = {
  name: string;
  run: (context: ExtractorContext) => Promise<T>;
};
