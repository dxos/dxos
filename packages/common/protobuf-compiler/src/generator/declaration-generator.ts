//
// Copyright 2020 DXOS.org
//

import * as protobufjs from 'protobufjs';
import * as ts from 'typescript';

import { normalizeFullyQualifiedName } from '../namespaces';
import { SubstitutionsMap } from '../parser';
import { createEnumDeclaration } from './enum';
import { createMessageDeclaration } from './message';
import { createServiceDeclaration } from './service';
import { getTypeReference } from './types';

const f = ts.factory;

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
