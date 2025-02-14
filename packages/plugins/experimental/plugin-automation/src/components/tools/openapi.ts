import { ToolResult, type Tool } from '@dxos/artifact';
import { JsonSchemaType, S, toEffectSchema } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { deepMapValues } from '@dxos/util';
import jsonpointer from 'jsonpointer';
import { type OpenAPIV2 } from 'openapi-types';

export type CreateToolsFromApiOptions = {
  authorization?: ApiAuthorization;
};

// TODO(dmaretskyi): effect schema.
export type ApiAuthorization =
  | {
      type: 'bearerApiKey';
      apiKey: string;
    }
  | {
      type: 'oauth';
      clientId: string;
      clientSecret: string;
      tokenUrl: string;
      grantType: string;
    };

export type ServiceDescriptor = {
  schemaUrl: string;
  authorization?: ApiAuthorization;
};

export const createToolsFromService = async (service: ServiceDescriptor): Promise<Tool[]> => {
  return createToolsFromApi(service.schemaUrl, { authorization: service.authorization });
};

export const createToolsFromApi = async (url: string, options?: CreateToolsFromApiOptions): Promise<Tool[]> => {
  const res = await fetch(url);
  const spec = (await res.json()) as OpenAPIV2.Document;

  log('spec', { spec });

  const tools: Tool[] = [];
  for (const [path, pathItem] of Object.entries(spec.paths)) {
    if (typeof pathItem !== 'object') {
      continue;
    }

    const { $ref, parameters, ...methods } = pathItem;
    for (const [method, methodItem] of Object.entries(methods)) {
      log('methodItem', { path, method, methodItem });

      const parametersResolved: OpenAPIV2.ParameterObject[] =
        methodItem.parameters?.map((parameter) => {
          const resolved = resolveJsonSchema(parameter, spec);
          return resolved;
        }) ?? [];

      const inputSchema: JsonSchemaType = {
        type: 'object',
        properties: {},
      };

      for (const parameter of parametersResolved) {
        log('parameter', { parameter });
        if (parameter.schema) {
          inputSchema.properties![parameter.name] = parameter.schema as JsonSchemaType;
        }
      }

      log('inputSchema', { inputSchema });
      invariant(S.is(JsonSchemaType)(inputSchema));

      if (!methodItem.operationId) {
        log.warn('no operationId', { path, method });
        continue;
      }
      if (!methodItem.summary) {
        log.warn('no summary', { path, method });
        continue;
      }

      const endpoint: EndpointDescriptor = {
        document: spec,
        path,
        method,
        parameters: parametersResolved,
        authorization: options?.authorization,
      };

      tools.push({
        name: methodItem.operationId,
        description: methodItem.summary,
        parameters: inputSchema,
        execute: async (input) => {
          const response = await callApiEndpoint(endpoint, input);
          return ToolResult.Success(response);
        },
      });
    }
  }

  return tools;
};

type EndpointDescriptor = {
  document: OpenAPIV2.Document;
  path: string;
  method: string;
  parameters: OpenAPIV2.ParameterObject[];
  authorization?: ApiAuthorization;
};

const callApiEndpoint = async (endpoint: EndpointDescriptor, input: any) => {
  const url = getEndpointUrl(endpoint);
  const request: RequestInit = {
    method: endpoint.method,
    headers: {},
  };
  let body: any = undefined;
  for (const parameter of endpoint.parameters) {
    switch (parameter.in) {
      case 'header': {
        if (parameter.example) {
          (request.headers as any)[parameter.name] = parameter.default;
        }
        break;
      }
      case 'body': {
        const value = input[parameter.name];

        // Client-side validation
        const effectSchema = toEffectSchema(parameter.schema);
        S.validateSync(effectSchema)(value);

        if (body) {
          throw new Error(`Duplicate body parameter: ${parameter.name}`);
        }
        body = value;
        break;
      }
    }
  }
  if (body) {
    request.body = JSON.stringify(body);
    (request.headers as any)['Content-Type'] = 'application/json';
  }

  if (endpoint.authorization) {
    (request.headers as any)['Authorization'] = await resolveAuthorization(endpoint.authorization);
  }

  log.info('request', { url, request });
  const response = await fetch(url, request);

  if (response.ok) {
    return response.json();
  } else {
    if (response.headers.get('Content-Type')?.includes('application/json')) {
      const error = await response.json();
      log.error('error', { error });
      throw new Error(error.message);
    } else {
      const error = await response.text();
      log.error('error', { error });
      throw new Error(error);
    }
  }
};

const getEndpointUrl = (endpoint: EndpointDescriptor) => {
  if (endpoint.document.basePath) {
    return `${endpoint.document.schemes?.[0] ?? 'https'}://${endpoint.document.host}${endpoint.document.basePath}${endpoint.path}`;
  } else {
    return `${endpoint.document.schemes?.[0] ?? 'https'}://${endpoint.document.host}${endpoint.path}`;
  }
};

export const resolveAuthorization = async (authorization: ApiAuthorization): Promise<string> => {
  switch (authorization.type) {
    case 'bearerApiKey': {
      return `Bearer ${authorization.apiKey}`;
    }
    case 'oauth': {
      const response = await fetch(authorization.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `grant_type=${authorization.grantType}&client_id=${authorization.clientId}&client_secret=${authorization.clientSecret}`,
      });
      const data = await response.json();
      return `Bearer ${data.access_token}`;
    }
    default: {
      throw new Error(`Unknown authorization type: ${(authorization as any).type}`);
    }
  }
};

/**
 * Resolves all $ref properties in a JSON schema.
 * Doesn't assume the structure of the schema.
 * The function looks from $ref properties in the schema and resolves them to their values in the base object.
 */
const resolveJsonSchema = (schema: any, base: any) => {
  return deepMapValues(schema, (value, recurse) => {
    if (typeof value === 'object' && value !== null && '$ref' in value && typeof value.$ref === 'string') {
      if (value.$ref.startsWith('#')) {
        const resolved = jsonpointer.get(base, value.$ref.slice(1));
        if (resolved) {
          return recurse(resolved);
        } else {
          log.warn('unresolved', { ref: value.$ref, base });
        }
      }
    }
    return recurse(value);
  });
};
