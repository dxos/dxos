//
// Copyright 2026 DXOS.org
//

/** Foreign-key source for the tags this plugin owns, so they are found again rather than duplicated. */
export const LABELER_TAG_SOURCE = 'org.dxos.plugin.labeler';

/** The two tags the plugin applies on top of the space's own labels. */
export const LabelerTag = {
  needsReply: { id: 'needs-reply', label: 'Needs reply', hue: 'cyan' },
  urgent: { id: 'urgent', label: 'Urgent', hue: 'red' },
} as const;

export type LabelerTagId = keyof typeof LabelerTag;
