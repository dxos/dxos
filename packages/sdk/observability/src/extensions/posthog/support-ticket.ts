//
// Copyright 2026 DXOS.org
//

/**
 * Builds the opening message of the support ticket that anchors a feedback submission.
 *
 * PostHog attaches the person's session replay, events, and errors to the ticket itself, so the
 * message only carries what PostHog cannot infer: the report text and where the debug dump went.
 */
export const supportTicketMessage = (message: string, debugLogDumpKey: string | null): string =>
  debugLogDumpKey ? `${message}\n\nDebug logs: \`${debugLogDumpKey}\`` : message;
