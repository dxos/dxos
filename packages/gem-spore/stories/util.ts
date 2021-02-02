//
// Copyright 2020 DXOS.org
//

import { button } from '@storybook/addon-knobs';

import { GraphType, ObjectMutator, useObjectMutator } from '@dxos/gem-core';

export const useDataButton = (generate, label='Refresh') => {
  const [data, setData, getData, updateData] = useObjectMutator(generate());
  button(label, () => setData(generate()));
  return [data, setData, getData, updateData] as ObjectMutator<GraphType>;
};
