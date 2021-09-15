//
// Copyright 2021 DXOS.org
//

import { createRamStorage } from "../util";
import { inMemory } from "./metadata-store.blueprint-test";

inMemory(createRamStorage);
