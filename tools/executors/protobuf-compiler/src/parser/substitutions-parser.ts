//
// Copyright 2020 DXOS.org
//

import { Project, Symbol, TypeChecker } from 'ts-morph';
import * as ts from 'typescript';

import { ModuleSpecifier } from '../module-specifier';

export interface ImportDescriptor {
  clause: ts.ImportClause;
  module: ModuleSpecifier;
}

/**
 * Protobuf FQN => Typescript identifier mapping.
 */
export type SubstitutionsMap = Partial<Record<string, string>>;

const getSubstitutionType = (
  substitutionProperty: Symbol,
  typeChecker: TypeChecker
) => {
  const substitutionType = typeChecker.getTypeOfSymbolAtLocation(
    substitutionProperty,
    substitutionProperty.getValueDeclarationOrThrow()
  );

  const decode = substitutionType.getPropertyOrThrow('decode');
  const decodeType = typeChecker.getTypeOfSymbolAtLocation(
    decode,
    decode.getValueDeclarationOrThrow()
  );
  return decodeType.getCallSignatures()[0].getReturnType();
};

/**
 * Parse a protobuf-substitutions file and return a map of protobuf FQN => Typescript identifier.
 */
export const parseSubstitutionsFile = (fileName: string): SubstitutionsMap => {
  const project = new Project({
    tsConfigFilePath: ts.findConfigFile(fileName, ts.sys.fileExists)
  });

  const sourceFile = project.addSourceFileAtPath(fileName);
  project.resolveSourceFileDependencies();
  const typeChecker = project.getTypeChecker();

  const exportSymbol = sourceFile.getDefaultExportSymbolOrThrow();
  const declarations = exportSymbol.getDeclarations();
  const exportType = typeChecker.getTypeOfSymbolAtLocation(
    exportSymbol,
    declarations[0]
  );

  const substitutions: Record<string, string> = {};
  for (const substitution of exportType.getProperties()) {
    const name = substitution.getName();
    const type = getSubstitutionType(substitution, typeChecker);
    substitutions[name] = type.getText();
  }

  return substitutions;
};
