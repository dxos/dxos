//
// Copyright 2026 DXOS.org
//

// @ts-expect-error Vite raw import.
import firetruckObj from '../../assets/models/firetruck.obj?raw';
// @ts-expect-error Vite raw import.
import raceObj from '../../assets/models/race.obj?raw';
// @ts-expect-error Vite raw import.
import taxiObj from '../../assets/models/taxi.obj?raw';

import type { Model } from '#types';

/** Bundled OBJ data for preset models. */
export const presetObjData: Record<Model.PresetType, string> = {
  firetruck: firetruckObj,
  race: raceObj,
  taxi: taxiObj,
};
