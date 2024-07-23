//
// Copyright 2024 DXOS.org
//

export const removeQueryParamByValue = (valueToRemove: string) => {
  const url = new URL(window.location.href);
  const params = Array.from(url.searchParams.entries());
  const [name] = params.find(([_, value]) => value === valueToRemove) ?? [null, null];
  if (name) {
    url.searchParams.delete(name);
    history.replaceState({}, document.title, url.href);
  }
};
