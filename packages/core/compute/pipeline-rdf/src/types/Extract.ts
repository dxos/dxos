//
// Copyright 2026 DXOS.org
//

/** A source document for fact extraction: the text plus provenance carried onto each fact. */
export type ExtractDocument = {
  readonly text: string;
  readonly source: string;
  readonly author?: string;
  readonly date?: string;
};

/** Options controlling fact extraction (model, provider, extra rules, strict-mode). */
export type ExtractOptions = {
  /** Extra extraction rules appended after the default rule set. */
  readonly rules?: readonly string[];
  /** Model DXN to extract with. Defaults to the extraction stage's default model. */
  readonly model?: string;
  /** Provider DXN for model resolution (e.g. `Provider.ollama.id`) when the model is not served by the default provider. */
  readonly provider?: string;
  /**
   * Attempt strict `generateObject` before the lenient `generateText` + salvage path. Strong hosted
   * models honor the schema, but local providers (Ollama) reliably fail structured output there, so
   * the strict call is pure wasted latency — pass `false` for those to make each chunk a single
   * generation. Defaults to `true`.
   */
  readonly strict?: boolean;
};
