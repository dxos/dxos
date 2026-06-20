//
// Copyright 2024 DXOS.org
//

export const isTrue = (str?: string | null, strict = true): boolean =>
  strict ? str === 'true' || str === '1' : str != null && !isFalse(str);

export const isFalse = (str?: string | null): boolean => str === 'false' || str === '0';

export const removeQueryParamByValue = (valueToRemove: string) => {
  const url = new URL(window.location.href);
  const params = Array.from(url.searchParams.entries());
  const match = params.find(([_, value]) => value === valueToRemove);
  if (match) {
    const next = new URLSearchParams();
    let removed = false;
    for (const [key, value] of params) {
      if (!removed && key === match[0] && value === valueToRemove) {
        removed = true;
        continue;
      }
      next.append(key, value);
    }
    url.search = next.toString();
    history.replaceState({}, document.title, url.href);
  }
};
