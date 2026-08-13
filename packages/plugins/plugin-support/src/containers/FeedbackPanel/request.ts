//
// Copyright 2026 DXOS.org
//

import { SupportOperation } from '#types';

/**
 * Collapse a {@link SupportOperation.SupportRequest} into the legacy `{ message, includeLogs }`
 * shape consumed by the Observability backend and the Discord help-thread service. Triage
 * metadata (type/severity/area/version) is embedded as a Markdown trailer so the
 * single-string `message` carries the full context.
 */
export const formatRequestMessage = (values: SupportOperation.SupportRequest): string => {
  const trailer = [
    `**Type:** ${values.type}`,
    `**Severity:** ${values.severity}`,
    values.area && `**Area:** ${values.area}`,
    values.version && `**Version:** ${values.version}`,
  ]
    .filter(Boolean)
    .join('\n');
  const heading = `# ${values.title}`;
  return [heading, values.body, '---', trailer].filter(Boolean).join('\n\n');
};
