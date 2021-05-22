//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import * as protobufjs from 'protobufjs';
import * as ts from 'typescript';

import { getFullNestedTypeName, getRelativeName, convertNameToIdentifier, getNamespaceName, namesEqual, getSafeNamespaceIdentifier, normalizeFullyQualifiedName } from './namespaces';
import { SubstitutionsMap } from './substitutions-parser';

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

function createSubstitutionsReference (type: string): ts.TypeNode {
  return f.createTypeReferenceNode(
    f.createIdentifier('ReturnType'),
    [f.createIndexedAccessTypeNode(
      f.createIndexedAccessTypeNode(
        f.createTypeQueryNode(f.createIdentifier('substitutions')),
        f.createLiteralTypeNode(f.createStringLiteral(type))
      ),
      f.createLiteralTypeNode(f.createStringLiteral('decode'))
    )]
  );
}

function getPrimitiveType(type: string): ts.TypeNode {
  switch (type) {
    case 'double': return f.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
    case 'float': return f.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
    case 'int32': return f.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
    case 'int64': return f.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
    case 'uint32': return f.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
    case 'uint64': return f.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
    case 'sint32': return f.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
    case 'sint64': return f.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
    case 'fixed32': return f.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
    case 'fixed64': return f.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
    case 'sfixed32': return f.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
    case 'sfixed64': return f.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
    case 'bool': return f.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
    case 'string': return f.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
    case 'bytes': return f.createTypeReferenceNode('Uint8Array');
    default: return f.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
  }
}

type PbType = protobufjs.Enum | protobufjs.Type | string 

function getScalarType(type: PbType, containingObject: protobufjs.ReflectionObject, subs: SubstitutionsMap) {
  if(typeof type === 'string') {
    return getPrimitiveType(type)
  } else if (subs[type.fullName.slice(1)]) {
    return createSubstitutionsReference(type.fullName.slice(1));
  } else {
    return getTypeReference(type, containingObject);
  }
}

function getScalarFieldType (field: protobufjs.Field, subs: SubstitutionsMap): ts.TypeNode {
  assert(field.message)
  field.resolve()
  return getScalarType(field.resolvedType ?? field.type, field.message, subs)
}

function getRpcTypes(method: protobufjs.Method, service: protobufjs.Service, subs: SubstitutionsMap): [ts.TypeNode, ts.TypeNode] {
  method.resolve()
  return [
    getScalarType(method.resolvedRequestType ?? method.requestType, service, subs),
    getScalarType(method.resolvedResponseType ?? method.responseType, service, subs),
  ]  
}

function getTypeReference (to: protobufjs.Type | protobufjs.Enum, from?: protobufjs.ReflectionObject) {
  const toNamespace = getNamespaceName(to);
  const fromNamespace = from && getNamespaceName(from);

  if (fromNamespace && namesEqual(toNamespace, fromNamespace)) {
    const relativeName = getRelativeName(getFullNestedTypeName(to), toNamespace);
    return f.createTypeReferenceNode(convertNameToIdentifier(relativeName));
  } else {
    const name = [getSafeNamespaceIdentifier(toNamespace), ...getFullNestedTypeName(to)];
    return f.createTypeReferenceNode(convertNameToIdentifier(name));
  }
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

function createRpcMethodType(method: protobufjs.Method, service: protobufjs.Service, subs: SubstitutionsMap) {
  assert(!method.requestStream, 'Streaming RPC requests are not supported.')
  assert(!method.responseStream, 'Streaming RPC responses are not supported.')

  const [requestType, responseType] = getRpcTypes(method, service, subs)

  return f.createFunctionTypeNode(
    undefined,
    [f.createParameterDeclaration(
      undefined,
      undefined,
      undefined,
      'request',
      undefined,
      requestType,
    )],
    f.createTypeReferenceNode(
      f.createIdentifier('Promise'),
      [responseType],
    )
  )
}

function createServiceDeclaration(type: protobufjs.Service, subs: SubstitutionsMap) {
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
      createRpcMethodType(method, type, subs),
    ))
  );
}

export function * createDeclarations (types: protobufjs.ReflectionObject[], subs: SubstitutionsMap): Generator<ts.Statement> {
  for (const obj of types) {
    if (obj instanceof protobufjs.Enum) {
      yield createEnumDeclaration(obj);
    } else if(obj instanceof protobufjs.Service) {
      yield createServiceDeclaration(obj, subs)
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

export function createTypeDictinary (root: protobufjs.NamespaceBase) {
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
