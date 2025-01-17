//
// Copyright 2025 DXOS.org
//

import { contributes, defineEvent, defineCapability, defineModule, definePlugin } from '../../core';

export const Number = defineCapability<number>('dxos.org/test/generator/number');

export const CountEvent = defineEvent('dxos.org/test/generator/count');

export const createPluginId = (id: string) => `dxos.org/test/generator/${id}`;

export const createNumberPlugin = (id: string) => {
  const number = Math.floor(Math.random() * 100);

  return definePlugin({ id }, [
    defineModule({
      id: `${id}/main`,
      activatesOn: CountEvent,
      activate: () => contributes(Number, number),
    }),
  ]);
};
