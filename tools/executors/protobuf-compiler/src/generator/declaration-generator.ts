//
// Copyright 2020 DXOS.org
//

import { default as protobufjs } from 'protobufjs';
import ts from 'typescript';

import { normalizeFullyQualifiedName } from '../namespaces.js';
import { GeneratorContext } from './context.js';
import { createEnumDeclaration } from './enum.js';
import { createMessageDeclaration } from './message.js';
import { createServiceDeclaration } from './service.js';
import { getTypeReference } from './types.js';

const f = ts.factory;

export function * createDeclarations (types: protobufjs.ReflectionObject[], ctx: GeneratorContext): Generator<ts.Statement> {
  for (const obj of types) {
    if (obj instanceof protobufjs.Enum) {
      yield createEnumDeclaration(obj, ctx);
    } else if (obj instanceof protobufjs.Service) {
      yield createServiceDeclaration(obj, ctx);
    } else if (obj instanceof protobufjs.Type) {
      yield createMessageDeclaration(obj, ctx);

      const nested = Array.from(createDeclarations(obj.nestedArray, ctx));
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
      yield * createDeclarations(obj.nestedArray, ctx);
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

export const createTypeDictionary = (root: protobufjs.NamespaceBase) => f.createInterfaceDeclaration(
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
