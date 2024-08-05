//
// Copyright 2024 DXOS.org
//

// TODO(burdon): Factor out to html util.

export const findAncestorWithData = (element: HTMLElement, dataKey: string): HTMLElement | null => {
  let currentElement: HTMLElement | null = element;
  while (currentElement) {
    if (currentElement.dataset && currentElement.dataset[dataKey]) {
      return currentElement;
    }
    currentElement = currentElement.parentElement;
  }

  return null;
};
