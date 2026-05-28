//
// Copyright 2026 DXOS.org
//

import type { Model } from '#types';

import firetruckObj from '../../assets/models/firetruck.obj?raw';
import raceObj from '../../assets/models/race.obj?raw';
import taxiObj from '../../assets/models/taxi.obj?raw';

/** Bundled OBJ data for preset models. */
export const presetObjData: Record<Model.PresetType, string> = {
  firetruck: firetruckObj,
  race: raceObj,
  taxi: taxiObj,
};
