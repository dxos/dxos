//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import * as protobufjs from 'protobufjs';
import * as ts from 'typescript';

import { normalizeFullyQualifiedName } from '../namespaces';
import { SubstitutionsMap } from '../parser/substitutions-parser';
import { types, getTypeReference } from './types';

const f = ts.factory;

function getFieldType (field: protobufjs.Field, subs: SubstitutionsMap): ts.TypeNode {
  if (field.repeated) {
    return f.createArrayTypeNode(getScalarFieldType(field, subs));
  } else if (field.map && field instanceof protobufjs.MapField) {
    return f.createTypeReferenceNode('Partial', [f.createTypeReferenceNode('Record', [
      f.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
      getScalarFieldType(field, subs)
    ])]);
  } else {
    return getScalarFieldType(field, subs);
  }
}

function getScalarFieldType (field: protobufjs.Field, subs: SubstitutionsMap): ts.TypeNode {
  assert(field.message);
  field.resolve();
  return types(field.resolvedType ?? field.type, field.message, subs);
}

function getRpcTypes (method: protobufjs.Method, service: protobufjs.Service, subs: SubstitutionsMap): [ts.TypeNode, ts.TypeNode] {
  method.resolve();
  return [
    types(method.resolvedRequestType ?? method.requestType, service, subs),
    types(method.resolvedResponseType ?? method.responseType, service, subs)
  ];
}

function createMessageDeclaration (type: protobufjs.Type, subs: SubstitutionsMap) {
  return f.createInterfaceDeclaration(
    undefined,
    [f.createToken(ts.SyntaxKind.ExportKeyword)],
    type.name,
    undefined,
    undefined,
    type.fieldsArray.map(field => f.createPropertySignature(
      undefined,
      field.name,
      field.required ? undefined : f.createToken(ts.SyntaxKind.QuestionToken),
      getFieldType(field, subs)
    ))
  );
}

function createEnumDeclaration (type: protobufjs.Enum) {
  return f.createEnumDeclaration(
    undefined,
    [f.createToken(ts.SyntaxKind.ExportKeyword)],
    type.name,
    Object.entries(type.values).map(([name, id]) => f.createEnumMember(
      name,
      f.createNumericLiteral(id)
    ))
  );
}

function createRpcMethodType (method: protobufjs.Method, service: protobufjs.Service, subs: SubstitutionsMap) {
  assert(!method.requestStream, 'Streaming RPC requests are not supported.');
  assert(!method.responseStream, 'Streaming RPC responses are not supported.');

  const [requestType, responseType] = getRpcTypes(method, service, subs);

  return f.createFunctionTypeNode(
    undefined,
    [f.createParameterDeclaration(
      undefined,
      undefined,
      undefined,
      'request',
      undefined,
      requestType
    )],
    f.createTypeReferenceNode(
      f.createIdentifier('Promise'),
      [responseType]
    )
  );
}

function createServiceDeclaration (type: protobufjs.Service, subs: SubstitutionsMap) {
  return f.createInterfaceDeclaration(
    undefined,
    [f.createToken(ts.SyntaxKind.ExportKeyword)],
    type.name,
    undefined,
    undefined,
    type.methodsArray.map(method => f.createPropertySignature(
      undefined,
      method.name,
      undefined,
      createRpcMethodType(method, type, subs)
    ))
  );
}

export function * createDeclarations (types: protobufjs.ReflectionObject[], subs: SubstitutionsMap): Generator<ts.Statement> {
  for (const obj of types) {
    if (obj instanceof protobufjs.Enum) {
      yield createEnumDeclaration(obj);
    } else if (obj instanceof protobufjs.Service) {
      yield createServiceDeclaration(obj, subs);
    } else if (obj instanceof protobufjs.Type) {
      yield createMessageDeclaration(obj, subs);

      const nested = Array.from(createDeclarations(obj.nestedArray, subs));
      if (nested.length > 0) {
        yield f.createModuleDeclaration(
          undefined,
          [f.createToken(ts.SyntaxKind.ExportKeyword)],
          f.createIdentifier(obj.name),
          f.createModuleBlock(nested),
          ts.NodeFlags.Namespace
        );
      }
    } else if (obj instanceof protobufjs.Namespace) {
      yield * createDeclarations(obj.nestedArray, subs);
    }
  }
}

function * getRegisteredTypes (root: protobufjs.NamespaceBase): Generator<protobufjs.Enum | protobufjs.Type> {
  for (const obj of root.nestedArray) {
    if (obj instanceof protobufjs.Enum) {
      yield obj;
    } else if (obj instanceof protobufjs.Type) {
      yield obj;
      yield * getRegisteredTypes(obj);
    } else if (obj instanceof protobufjs.Namespace) {
      yield * getRegisteredTypes(obj);
    }
  }
}

export function createTypeDictionary (root: protobufjs.NamespaceBase) {
  return f.createInterfaceDeclaration(
    undefined,
    [f.createToken(ts.SyntaxKind.ExportKeyword)],
    'TYPES',
    undefined,
    undefined,
    Array.from(getRegisteredTypes(root))
      .sort((b, a) => b.fullName.localeCompare(a.fullName))
      .map(type => f.createPropertySignature(
        undefined,
        f.createStringLiteral(normalizeFullyQualifiedName(type.fullName)),
        undefined,
        getTypeReference(type)
      ))
  );
}

function * getServices (root: protobufjs.NamespaceBase): Generator<protobufjs.Service> {
  for (const obj of root.nestedArray) {
    if (obj instanceof protobufjs.Service) {
      yield obj;
      yield * getServices(obj);
    } else if (obj instanceof protobufjs.Namespace) {
      yield * getServices(obj);
    }
  }
}

export function createServicesDictionary (root: protobufjs.NamespaceBase) {
  return f.createInterfaceDeclaration(
    undefined,
    [f.createToken(ts.SyntaxKind.ExportKeyword)],
    'SERVICES',
    undefined,
    undefined,
    Array.from(getServices(root))
      .sort((b, a) => b.fullName.localeCompare(a.fullName))
      .map(type => f.createPropertySignature(
        undefined,
        f.createStringLiteral(normalizeFullyQualifiedName(type.fullName)),
        undefined,
        getTypeReference(type)
      ))
  );
}
