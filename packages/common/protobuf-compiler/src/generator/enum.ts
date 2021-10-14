//
// Copyright 2020 DXOS.org
//

import * as protobufjs from 'protobufjs';
import * as ts from 'typescript';

const f = ts.factory;

export function createEnumDeclaration (type: protobufjs.Enum) {
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
