//
// Copyright 2026 DXOS.org
//

export type IdiomHost = {
  /** Path relative to the scan root. */
  file: string;
  /** 1-indexed line where the JSDoc opens. */
  line: number;
  /** Best-effort name of the export immediately following the JSDoc. */
  symbol?: string;
  /** Detected host kind based on file location and symbol shape. */
  kind: 'story' | 'test' | 'symbol';
};

export type Idiom = {
  /** Globally unique kebab-case slug. */
  slug: string;
  /** Leading JSDoc paragraph (rationale). */
  summary?: string;
  /** Applicability (required field per IDIOMS.md). */
  applies?: string;
  /** Anti-pattern this replaces. */
  insteadOf?: string;
  /** Raw {@link …} targets named under `uses:`. */
  uses: string[];
  /** Slugs of related idioms. */
  related: string[];
  host: IdiomHost;
};
