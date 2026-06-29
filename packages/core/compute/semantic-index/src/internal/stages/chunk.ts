//
// Copyright 2026 DXOS.org
//

/** Split text into analyzable chunks. v1: one chunk per document (messages are short). */
export const chunk = (text: string): string[] => {
  const trimmed = text.trim();
  return trimmed.length ? [trimmed] : [];
};
