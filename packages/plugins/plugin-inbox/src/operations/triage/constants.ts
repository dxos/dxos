//
// Copyright 2026 DXOS.org
//

/**
 * Foreign-key source for the tags and project triage owns, so they are found again rather than duplicated;
 * it keeps the id triage had as its own plugin, which existing tags and projects carry.
 */
export const TRIAGE_SOURCE = 'org.dxos.plugin.labeler';

/** The tag triage applies on top of the space's own labels and the inbox's priority bands. */
export const TriageTag = {
  needsReply: { id: 'needs-reply', label: 'Needs reply', hue: 'cyan' },
} as const;

export type TriageTagId = keyof typeof TriageTag;
