//
// Copyright 2026 DXOS.org
//

/**
 * Object links inside derived summaries. A summary is markdown whose mentions of known people and
 * organizations are `[label](echo:…)` links, which the conversation tile renders as object chips with
 * a preview card; one-line rows (the collapsed message, related-message lists) show the labels only.
 *
 * Kept free of imports so the pure text rules are testable without the ECHO stack.
 */

/** A `[label](echo:…)` / `[label](eid:…)` markdown link; group 1 is the label, group 2 the URI. */
const OBJECT_LINK = /\[([^\]\n]+)\]\(((?:echo|eid):[^)\s]+)\)/g;

/** Markdown strong emphasis, which a one-line row would otherwise show as literal asterisks. */
const STRONG = /\*\*([^*\n]+)\*\*/g;

/** Something a summary may link to: the label it is known by and the URI its chip resolves. */
export type ObjectReference = {
  readonly label: string;
  readonly uri: string;
  /** What it is, e.g. `person` or `organization`; given to the model so it links the right noun. */
  readonly kind: string;
  /** Disambiguating context, e.g. a person's employer. */
  readonly detail?: string;
};

/** Replaces every object link with its label. */
export const stripObjectLinks = (text: string): string => text.replace(OBJECT_LINK, '$1');

/** A summary as one line of plain text: object links become their labels and emphasis is dropped. */
export const toPlainSummary = (text: string): string => stripObjectLinks(text).replace(STRONG, '$1');

/**
 * Unlinks every object link whose URI is not one of `known`, so a URI the model invented never
 * renders as a chip that resolves to nothing.
 */
export const keepKnownObjectLinks = (text: string, known: ReadonlySet<string>): string =>
  text.replace(OBJECT_LINK, (link: string, label: string, uri: string) => (known.has(uri) ? link : label));

/** Prompt section listing the objects the model may link; empty when there are none. */
export const referencesPrompt = (references: readonly ObjectReference[]): string => {
  if (references.length === 0) {
    return '';
  }
  const lines = references.map(
    ({ label, uri, kind, detail }) => `- ${label} (${detail ? `${kind}, ${detail}` : kind}): ${uri}`,
  );
  return [
    'KNOWN OBJECTS — when the summary mentions one of these, write the mention as a markdown link to',
    'its URI exactly as listed, e.g. [Ada Lovelace](echo:///01ABC). Link each object at most once and',
    'never link anything that is not listed.',
    ...lines,
  ].join('\n');
};
