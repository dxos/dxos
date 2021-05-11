//
// Copyright 2020 DXOS.org
//

// TODO(burdon): Create index.
export const searchSelector = (search: any) => (selection: any) => {
  const match = (pattern: any, text: any) => {
    if (!pattern) {
      return true;
    }

    if (!text) {
      return false;
    }

    // TODO(burdon): Prefix match.
    return text.toLowerCase().indexOf(pattern) !== -1;
  };

  // TODO(burdon): Use selection to filter.
  return selection.items.filter((item: any) => {
    // TODO(burdon): Filter types.
    if (item.type.indexOf('example') === -1) {
      return false;
    }

    // TODO(burdon): Generalize.
    const text = item.model.getProperty('name');
    return match(search, text);
  });
};
