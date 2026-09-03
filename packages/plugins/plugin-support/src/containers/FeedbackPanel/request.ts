//
// Copyright 2026 DXOS.org
//

import { SupportOperation } from '#types';

/**
 * Collapse a {@link SupportOperation.SupportRequest} into the message filed as the support ticket.
 * The ticket anchors the report's telemetry, so everything the team needs to triage — triage
 * metadata, identity, screenshot — travels on this one string. PostHog's conversation traits only
 * carry name/email, which is why the DID rides in the trailer instead.
 */
export const formatRequestMessage = (
  values: SupportOperation.SupportRequest,
  screenshotUrl?: string,
  did?: string,
): string => {
  const trailer = [
    values.type && `**Type:** ${values.type}`,
    values.severity && `**Severity:** ${values.severity}`,
    values.area && `**Area:** ${values.area}`,
    values.version && `**Version:** ${values.version}`,
    did && `**DID:** ${did}`,
  ]
    .filter(Boolean)
    .join('\n');
  const heading = `# ${values.title}`;
  const image = screenshotUrl && `![Screenshot](${screenshotUrl})`;
  return [heading, image, values.body, '---', trailer].filter(Boolean).join('\n\n');
};

/**
 * The report text that is safe for the public Discord thread: what the user wrote, nothing else.
 * Logs, screenshots, and the trailer stay on the ticket, visible only to the team.
 */
export const formatPublicMessage = (values: SupportOperation.SupportRequest): string =>
  [`# ${values.title}`, values.body].filter(Boolean).join('\n\n');
