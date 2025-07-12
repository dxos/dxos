//
// Copyright 2025 DXOS.org
//

import { type TagPickerItemData, type TagPickerOptions } from '@dxos/react-ui-tag-picker';

const registry: TagPickerItemData[] = ['Chess', 'Tasks', 'Travel'].map((id) => ({ id, label: id }));

export const onSearchBlueprints: TagPickerOptions['onSearch'] = (text, ids) => {
  return registry.filter(({ id, label }) => ids.indexOf(id) === -1 && label.toLowerCase().includes(text.toLowerCase()));
};
