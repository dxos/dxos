//
// Copyright 2024 DXOS.org
//

import * as Schema from "effect/Schema";

import { ComputeGraph } from "@dxos/conductor";
import { Type } from "@dxos/echo";
import { TypedObject } from "@dxos/echo/internal";
import { Function } from "@dxos/functions";

// TODO(burdon): Factor out and reconcile with https://github.com/dxos/dxos/blob/main/packages/plugins/plugin-token-manager/src/defs/presets.ts#L7

const ApiAuthorizationKey = Schema.Struct({
	type: Schema.Literal("api-key"),
	key: Schema.String,
	placement: Schema.Union(
		Schema.Struct({
			type: Schema.Literal("authorization-header"),
		}),
		Schema.Struct({
			type: Schema.Literal("query"),
			name: Schema.String,
		}),
	),
});

const ApiAuthorizationOauth = Schema.Struct({
	type: Schema.Literal("oauth"),
	clientId: Schema.String,
	clientSecret: Schema.String,
	tokenUrl: Schema.String,
	grantType: Schema.String,
});

export const ApiAuthorization = Schema.Union(
	ApiAuthorizationKey,
	ApiAuthorizationOauth,
);
export type ApiAuthorization = Schema.Schema.Type<typeof ApiAuthorization>;

const ServiceInterfaceFunction = Schema.Struct({
	kind: Schema.Literal("function"),
	fn: Type.Ref(Function.Function),
});

const ServiceInterfaceWorkflow = Schema.Struct({
	kind: Schema.Literal("workflow"),
	workflow: Type.Ref(ComputeGraph),
});

const ServiceInterfaceApi = Schema.Struct({
	kind: Schema.Literal("api"),

	/**
	 * URL to fetch the openapi schema.
	 */
	schemaUrl: Schema.optional(Schema.String),

	/**
	 * Inlined openapi schema.
	 */
	schema: Schema.optional(Schema.Any),

	/**
	 * Authorization configuration if required.
	 */
	authorization: Schema.optional(ApiAuthorization),
});

const ServiceInterface = Schema.Union(
	// Service types.
	ServiceInterfaceFunction,
	ServiceInterfaceWorkflow,
	ServiceInterfaceApi,
) as any;

export type ServiceInterface = Schema.Schema.Type<typeof ServiceInterface>;

export class ServiceType extends TypedObject({
	typename: "dxos.org/type/ServiceType",
	version: "0.1.0",
})({
	serviceId: Schema.String,
	name: Schema.optional(Schema.String),
	description: Schema.optional(Schema.String),
	category: Schema.optional(Schema.String),
	enabled: Schema.optional(Schema.Boolean),

	/**
	 * Entries exposed: functions, workflows, and APIs.
	 */
	interfaces: Schema.optional(Schema.Array(ServiceInterface)),
}) {}

//
// Service Registry
//

export interface BaseServiceRegistry {
	queryServices(query?: ServiceQuery): Promise<ServiceType[]>;
}

export type ServiceQuery = {
	name?: string;
	category?: string;
};

export const categoryIcons: Record<string, string> = {
	finance: "ph--bank--regular",
	health: "ph--heart--regular",
	geolocation: "ph--globe-simple--regular",
	education: "ph--books--regular",
	entertainment: "ph--music-notes--regular",
	shopping: "ph--shopping-cart--regular",
	travel: "ph--airplane-takeoff--regular",
	utilities: "ph--lightning--regular",
	weather: "ph--cloud-rain--regular",
} as const;
