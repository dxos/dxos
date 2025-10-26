//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from "@dxos/app-framework";

export const meta: PluginMeta = {
	id: "dxos.org/plugin/table",
	name: "Tables",
<<<<<<< HEAD
	description: "Create and manage structured, relational data tables.",
||||||| 35c939cd42
	description: 'Tables in Composer allow you to create or display structured data. Composer Tables store their data locally inside of your ECHO database and can be linked to one another relationally. Tables can be created manually, or by prompting your AI chat assistant. Like all other plugins, Table data is available to the LLM in real time to provide additional content for any automated workflow.',
=======
	description: 'Create and manage structured, relational data tables.',
>>>>>>> origin/main
	icon: "ph--table--regular",
<<<<<<< HEAD
	iconHue: "green",
||||||| 35c939cd42
=======
	iconHue: 'green',
>>>>>>> origin/main
  source:
	"https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-table",
	screenshots: ["https://dxos.network/plugin-details-tables-dark.png"],
};
