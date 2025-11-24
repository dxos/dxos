//
// Copyright 2024 DXOS.org
//

import { SpaceProperties } from "@dxos/client-protocol";
import type { EchoDatabase, SerializedSpace } from "@dxos/echo-db";
import { Filter, Serializer, decodeReferenceJSON } from "@dxos/echo-db";

export const importSpace = async (
	database: EchoDatabase,
	data: SerializedSpace,
) => {
	const {
		objects: [properties],
	} = await database.query(Filter.type(SpaceProperties)).run();

	await new Serializer().import(database, data, {
		onObject: async (object) => {
			const { "@type": typeEncoded, ...data } = object;
			const type = decodeReferenceJSON(typeEncoded);
			// Handle Space Properties
			if (properties && type?.objectId === SpaceProperties.typename) {
				Object.entries(data).forEach(([name, value]) => {
					if (!name.startsWith("@")) {
						(properties as any)[name] = value;
					}
				});
				return false;
			}
			return true;
		},
	});
};
