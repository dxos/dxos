//
// Copyright 2025 DXOS.org
//

/**
 * Normalize construction of URLs.
 */
export const createUrl = (url: URL | string, search?: Record<string, any | undefined>): URL => {
  const base = typeof url === 'string' ? new URL(url) : url;
  if (search) {
    base.search = new URLSearchParams(Object.entries(search).filter(([_, value]) => value != null)).toString();
  }

  return base;
};
