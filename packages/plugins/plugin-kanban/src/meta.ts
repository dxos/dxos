//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from "@dxos/app-framework";

export const meta: PluginMeta = {
	id: "dxos.org/plugin/kanban",
	name: "Kanban",
	description:
		"Kanban allows you to explore Table data in sorted columns defined by your custom schema. You can use Kanbans to track progress or trigger custom automations when cards are moved from one state to another.",
	icon: "ph--kanban--regular",
	iconHue: "green",
	source:
		"https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-kanban",
	screenshots: ["https://dxos.network/plugin-details-kanban-dark.png"],
};
