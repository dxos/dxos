//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from "@dxos/app-framework";
import { trim } from "@dxos/util";

export const meta: PluginMeta = {
	id: "dxos.org/plugin/chess",
	name: "Chess",
	description: trim`
    Play chess with friends or practice with the AI.
  `,
	icon: "ph--shield-chevron--regular",
	iconHue: "sky",
	source:
		"https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-chess",
	screenshots: ["https://dxos.network/plugin-details-chess-dark.png"],
};
