//
// Copyright 2025 DXOS.org
//

// Kept out of `PreviewComponent.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on
// every edit.

const HEIGHT_PATTERN = /^(.*)\|(\d+)$/;

export const parseEmbedLabel = (alt: string): { baseLabel: string; height?: number } => {
  const match = HEIGHT_PATTERN.exec(alt ?? '');
  if (match) {
    const height = Number.parseInt(match[2], 10);
    if (Number.isFinite(height) && height > 0) {
      return { baseLabel: match[1], height };
    }
  }
  return { baseLabel: alt ?? '' };
};
