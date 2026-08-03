//
// Copyright 2026 DXOS.org
//

import { type PathResolution } from '@dxos/app-graph';
import { UrlPath } from '@dxos/app-toolkit';

/**
 * Separator inside a popped companion's URL id. `~` is the linked-segment marker, which only ever
 * appears at the start of a node-id segment, so it cannot occur inside a represented key or variant.
 */
const SEPARATOR = '~';

/**
 * URL id for a popped companion: `<sourceKey>~<sourceId>~<variant>`.
 *
 * Self-contained on purpose. A clone outlives the plank it was popped from, so it cannot be addressed
 * positionally ("the companion of the preceding pair") the way the sidebar's own selection is — the
 * source may not be in the chain at all.
 */
export const formatCompanionUrlId = (source: PathResolution.RepresentedNode, variant: string): string =>
  `${source.key}${SEPARATOR}${source.id ?? ''}${SEPARATOR}${variant}`;

/**
 * Inverse of {@link formatCompanionUrlId}, or undefined for a plain `companion/<variant>` id (the
 * sidebar-relative form this supersedes, still produced by older URLs). The key is taken up to the
 * first separator and the variant after the last, so an id containing one is not misread.
 */
export const parseCompanionUrlId = (
  urlId: string,
): { sourceKey: string; sourceId: string; variant: string } | undefined => {
  const first = urlId.indexOf(SEPARATOR);
  const last = urlId.lastIndexOf(SEPARATOR);
  if (first < 1 || last === first) {
    return undefined;
  }

  return {
    sourceKey: urlId.slice(0, first),
    sourceId: urlId.slice(first + SEPARATOR.length, last),
    variant: urlId.slice(last + SEPARATOR.length),
  };
};

/**
 * URL value for the sidebar's selected panel. A node-scoped selection is stored by variant (it rebinds
 * to whatever holds attention), so it serializes as a linked segment; a root-level one is its own id.
 */
export const formatContextUrlValue = (panel: string, nodeVariant: string | undefined): string =>
  nodeVariant ? `${SEPARATOR}${nodeVariant}` : panel;

/** Inverse of {@link formatContextUrlValue}: the variant of a node selection, else undefined. */
export const parseContextUrlValue = (value: string): { variant?: string; panel?: string } =>
  value.startsWith(SEPARATOR) ? { variant: value.slice(SEPARATOR.length) } : { panel: value };

/**
 * Rewrites each self-contained companion pair into the (source, companion) sequence the linked tier
 * resolves against — the linked resolver looks at the pair before it — and reports which indices are
 * those synthesized sources, so the caller can drop them from the deck's plank list. Pairs that are not
 * composites (including a bare `companion/<variant>` from an older URL) pass through untouched.
 */
export const expandCompanionPairs = (
  pairs: readonly UrlPath.Pair[],
): { pairs: UrlPath.Pair[]; synthetic: ReadonlySet<number> } => {
  const synthetic = new Set<number>();
  const expanded: UrlPath.Pair[] = [];
  for (const pair of pairs) {
    const composite = pair.key === UrlPath.COMPANION_KEY && pair.id ? parseCompanionUrlId(pair.id) : undefined;
    if (composite) {
      synthetic.add(expanded.length);
      expanded.push({ key: composite.sourceKey, id: composite.sourceId, workspace: pair.workspace });
      expanded.push({ key: pair.key, id: composite.variant, workspace: pair.workspace });
    } else {
      expanded.push(pair);
    }
  }

  return { pairs: expanded, synthetic };
};
