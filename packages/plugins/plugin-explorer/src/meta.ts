//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from "@dxos/app-framework";

export const meta: PluginMeta = {
	id: "dxos.org/plugin/explorer",
	name: "Explorer",
	description:
		"Install this plugin to view a hypergraph of all objects inside of your Space.",
	icon: "ph--graph--regular",
	iconHue: "green",
	source:
		"https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-explorer",
	tags: ["labs"],
	screenshots: ["https://dxos.network/plugin-details-explorer-dark.png"],
};
