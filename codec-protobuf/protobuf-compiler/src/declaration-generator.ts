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
    return f.createArrayTypeNode(getScalarType(field, subs));
  } else if (field.map && field instanceof protobufjs.MapField) {
    return f.createTypeReferenceNode('Partial', [f.createTypeReferenceNode('Record', [
      f.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
      getScalarType(field, subs)
    ])]);
  } else {
    return getScalarType(field, subs);
  }
}

function getScalarType (field: protobufjs.Field, subs: SubstitutionsMap): ts.TypeNode {
  switch (field.type) {
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
    default:
      if (!field.resolved) {
        field.resolve();
      }
      if (field.resolvedType && subs[field.resolvedType.fullName.slice(1)]) {
        return subs[field.resolvedType.fullName.slice(1)]!.typeNode;
      }
      if (field.resolvedType) {
        assert(field.message);
        return getTypeReference(field.resolvedType, field.message);
      }

      return f.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
  }
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

export function * createDeclarations (types: protobufjs.ReflectionObject[], subs: SubstitutionsMap): Generator<ts.Statement> {
  for (const obj of types) {
    if (obj instanceof protobufjs.Enum) {
      yield createEnumDeclaration(obj);
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
    // sort here by type.fullName
    .map(type => f.createPropertySignature(
      undefined,
      f.createStringLiteral(normalizeFullyQualifiedName(type.fullName)),
      undefined,
      getTypeReference(type)
    ))
  );
}
