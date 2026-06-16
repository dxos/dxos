//
// Copyright 2024 DXOS.org
//

export const isTrue = (str?: string | null, strict = true): boolean =>
  strict ? str === 'true' || str === '1' : str != null && !isFalse(str);

export const isFalse = (str?: string | null): boolean => str === 'false' || str === '0';

export const removeQueryParamByValue = (valueToRemove: string) => {
  const url = new URL(window.location.href);
  const params = Array.from(url.searchParams.entries());
  const [name] = params.find(([_, value]) => value === valueToRemove) ?? [null, null];
  if (name) {
    url.searchParams.delete(name);
    history.replaceState({}, document.title, url.href);
  }
};
