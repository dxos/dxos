//
// Copyright 2025 DXOS.org
//

import { DESIGN_SPEC_BLUEPRINT, TASK_LIST_BLUEPRINT } from '@dxos/artifact-testing';
import { type TagPickerItemData, type TagPickerOptions } from '@dxos/react-ui-tag-picker';

export const blueprints = [DESIGN_SPEC_BLUEPRINT, TASK_LIST_BLUEPRINT];

const registry: TagPickerItemData[] = blueprints.map((blueprint, i) => ({
  id: `blueprint-${i}`, // TODO(burdon): Need static DXN for registry (before added to space).
  label: blueprint.name,
}));

export const onSearchBlueprints: TagPickerOptions['onSearch'] = (text, ids) => {
  return registry.filter(({ id, label }) => ids.indexOf(id) === -1 && label.toLowerCase().includes(text.toLowerCase()));
};
