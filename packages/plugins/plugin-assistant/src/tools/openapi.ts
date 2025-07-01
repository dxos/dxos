//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';
import jsonpointer from 'jsonpointer';
import { type OpenAPIV2, type OpenAPIV3_1 } from 'openapi-types';

import { type ExecutableTool, ToolResult, createRawTool } from '@dxos/ai';
import { Type } from '@dxos/echo';
import { normalizeSchema } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { deepMapValues } from '@dxos/util';

import type { ApiAuthorization, ServiceType } from '../types';

export type CreateToolsFromApiOptions = {
  authorization?: ApiAuthorization;
  instructions?: string;
};

export const createToolsFromService = async (service: ServiceType): Promise<ExecutableTool[]> => {
  invariant(service.interfaces?.length === 1 && service.interfaces[0].kind === 'api');
  const iface = service.interfaces[0];
  invariant(iface.schemaUrl);
  invariant(iface.schemaUrl);
  return createToolsFromApi(iface.schemaUrl, { authorization: iface.authorization });
};

export const createToolsFromApi = async (
  url: string,
  options?: CreateToolsFromApiOptions,
): Promise<ExecutableTool[]> => {
  const res = await fetch(url);
  const spec = (await res.json()) as OpenAPIV2.Document;
  log('spec', { spec });

  const tools: ExecutableTool[] = [];
  for (const [path, pathItem] of Object.entries(spec.paths)) {
    if (typeof pathItem !== 'object') {
      continue;
    }

    const { ...methods } = pathItem;
    for (const [method, m] of Object.entries(methods)) {
      const methodItem: OpenAPIV2.OperationObject = m as OpenAPIV2.OperationObject;
      log('methodItem', { path, method, methodItem });

      const parametersResolved: OpenAPIV2.ParameterObject[] =
        methodItem.parameters?.map((parameter: any) => {
          const resolved = resolveJsonSchema(parameter, spec);
          return resolved;
        }) ?? [];

      const inputSchema: Type.JsonSchema = {
        type: 'object',
        properties: {},
      };

      const endpointParameters: OpenAPIV2.ParameterObject[] = [];
      for (const parameter of parametersResolved) {
        log('parameter', { parameter });

        if (
          options?.authorization?.type === 'api-key' &&
          options.authorization.placement.type === 'query' &&
          parameter.in === 'query' &&
          parameter.name === options.authorization.placement.name
        ) {
          continue;
        }

        endpointParameters.push(parameter);

        if (parameter.schema) {
          inputSchema.properties![parameter.name] = normalizeSchema(parameter.schema);
        } else if (typeof parameter.type === 'string') {
          const { name, in: _in, required, ...schema } = parameter;
          inputSchema.properties![name] = normalizeSchema(schema);
          if (required) {
            inputSchema.required ??= [];
            inputSchema.required!.push(name);
          }
        }
      }

      log('inputSchema', { inputSchema });
      Schema.validateSync(Type.JsonSchema)(inputSchema);

      const description = methodItem.description ?? methodItem.summary;
      if (!description) {
        log.warn('no description', { path, method });
        continue;
      }

      const endpoint: EndpointDescriptor = {
        document: spec,
        path,
        method,
        parameters: endpointParameters,
        authorization: options?.authorization,
      };

      tools.push(
        // TODO(burdon): Namespace?
        createRawTool('openapi', {
          name: getToolName(path, method, methodItem),
          description: options?.instructions ? `${options.instructions}\n\n${description}` : description,
          parameters: inputSchema,
          execute: async (input) => {
            const response = await callApiEndpoint(endpoint, input);
            return ToolResult.Success(response);
          },
        }),
      );
    }
  }

  return tools;
};

const getToolName = (path: string, method: string, methodItem: OpenAPIV2.OperationObject) => {
  if (methodItem.operationId) {
    return methodItem.operationId;
  }

  // Generate a name from the path and method.
  let name = `${method.toLowerCase()}_${path.replaceAll(/[{}/]/g, '_')}`;
  while (name.length > MAX_TOOL_NAME_LENGTH) {
    const lengthBefore = name.length;

    for (const word of GENERIC_WORDS) {
      if (name.includes(word)) {
        name = name.replace(word, '');
        break;
      }
    }
    name = name.replaceAll('__', '_').replace(/_$/, '');

    const lengthAfter = name.length;
    if (lengthBefore === lengthAfter) {
      break;
    }
  }
  name = name.replaceAll('__', '_').replace(/_$/, '').replace(/^_/, '');

  return name.slice(0, MAX_TOOL_NAME_LENGTH);
};

const MAX_TOOL_NAME_LENGTH = 64;
const GENERIC_WORDS = [
  'services',
  'service',
  'api',
  'rest',
  'endpoint',
  'get',
  'post',
  'put',
  'delete',
  'patch',
  'head',
  'options',
  'trace',
  'service',
  'api',
  'endpoint',
];

type EndpointDescriptor = {
  document: OpenAPIV3_1.Document | OpenAPIV2.Document;
  path: string;
  method: string;
  parameters: OpenAPIV2.ParameterObject[];
  authorization?: ApiAuthorization;
};

const callApiEndpoint = async (endpoint: EndpointDescriptor, input: any) => {
  log.info('endpoint', { method: endpoint.method, name: endpoint.path, input });

  let url = getEndpointUrl(endpoint);
  const request: RequestInit = {
    method: endpoint.method,
    headers: {},
  };
  const query = new URLSearchParams();
  let body: any;
  for (const parameter of endpoint.parameters) {
    if (input[parameter.name] === undefined) {
      continue;
    }

    switch (parameter.in) {
      case 'header': {
        if (parameter.example) {
          (request.headers as any)[parameter.name] = parameter.default;
        }
        break;
      }
      case 'path': {
        url = url.replace(`{${parameter.name}}`, encodeURIComponent(input[parameter.name]));
        break;
      }
      case 'body': {
        const value = input[parameter.name];

        // Client-side validation
        const effectSchema = Type.toEffectSchema(parameter.schema);
        Schema.validateSync(effectSchema)(value);

        if (body) {
          throw new Error(`Duplicate body parameter: ${parameter.name}`);
        }
        body = value;
        break;
      }
      case 'query': {
        query.set(parameter.name, input[parameter.name]);
        break;
      }
    }
  }

  if (
    (endpoint.authorization?.type === 'api-key' && endpoint.authorization.placement.type === 'authorization-header') ||
    endpoint.authorization?.type === 'oauth'
  ) {
    (request.headers as any).Authorization = await resolveAuthorization(endpoint.authorization);
  } else if (endpoint.authorization?.type === 'api-key' && endpoint.authorization.placement.type === 'query') {
    query.set(endpoint.authorization.placement.name, endpoint.authorization.key);
  }

  if (query.size > 0) {
    url += `?${query.toString()}`;
  }

  if (body) {
    request.body = JSON.stringify(body);
    (request.headers as any)['Content-Type'] = 'application/json';
  }

  log.info('request', { url, request });
  const response = await fetch(url, request);

  log.info('response', { ok: response.ok, status: response.status, statusText: response.statusText });

  if (response.ok) {
    const contentType = response.headers.get('Content-Type');
    if (contentType?.includes('application/json')) {
      return await response.json();
    } else {
      return await response.text();
    }
  } else {
    if (response.headers.get('Content-Type')?.includes('application/json')) {
      const responseBody = await response.text();
      let error: any;
      try {
        error = JSON.parse(responseBody);
      } catch {
        error = responseBody;
      }
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
  let url = '';
  if (isV3_1(endpoint.document) && endpoint.document.servers && endpoint.document.servers.length > 0) {
    url = endpoint.document.servers[0].url;
  } else {
    invariant(!isV3_1(endpoint.document));
    url = `${endpoint.document.schemes?.[0] ?? 'https'}://${endpoint.document.host}`;
  }

  if (!isV3_1(endpoint.document) && endpoint.document.basePath) {
    url += endpoint.document.basePath;
  }

  url += endpoint.path;

  return url;
};

export const resolveAuthorization = async (authorization: ApiAuthorization): Promise<string> => {
  switch (authorization.type) {
    case 'api-key': {
      invariant(authorization.placement.type === 'authorization-header');
      return `Bearer ${authorization.key}`;
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

const isV3_1 = (document: OpenAPIV3_1.Document | OpenAPIV2.Document): document is OpenAPIV3_1.Document => {
  return (document as any).openapi === '3.0.1';
};
