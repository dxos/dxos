//
// Copyright 2020 DXOS.org
//

import { RealFileSystemHost } from '@ts-morph/common';
import * as ts from '@typescript/typescript6';
import { Project, type Symbol, type TypeChecker } from 'ts-morph';

import { type ModuleSpecifier } from '../module-specifier.ts';

export interface ImportDescriptor {
  clause: ts.ImportClause;
  module: ModuleSpecifier;
}

// Matches a relative specifier ending in `.ts`/`.tsx` inside a static `from '...'` clause or a
// dynamic `import('...')` call, capturing which so the replacement can pick the matching JS extension.
const RELATIVE_TS_IMPORT = /((?:from\s*|import\s*\(\s*)['"])(\.\.?\/[^'"]+?)\.(tsx?)(['"])/g;

/**
 * The repo writes `.ts`/`.tsx` extensions on relative imports (`rewriteRelativeImportExtensions`
 * in tsconfig.base.json), but `ts-morph` vendors its own TypeScript (~4.8) predating
 * `allowImportingTsExtensions` (TS 5.0) — it rejects a relative specifier ending in `.ts` outright.
 * Node16/NodeNext resolution — already forced below to match how the generated code is actually
 * consumed — has always resolved a `.js` specifier to a sibling `.ts` file, so rewriting the
 * extension here (only in this isolated parse, never touching the file on disk) keeps a substitutions
 * file's own imports on the same explicit-extension style as everything else in the repo.
 */
const rewriteTsImportExtensions = (text: string): string =>
  text.replace(RELATIVE_TS_IMPORT, (_match, prefix, path, ext, suffix) =>
    `${prefix}${path}.${ext === 'tsx' ? 'jsx' : 'js'}${suffix}`,
  );

class SubstitutionsFileSystemHost extends RealFileSystemHost {
  override readFileSync(filePath: string, encoding?: string): string {
    const text = super.readFileSync(filePath, encoding);
    return /\.tsx?$/.test(filePath) ? rewriteTsImportExtensions(text) : text;
  }

  override async readFile(filePath: string, encoding?: string): Promise<string> {
    const text = await super.readFile(filePath, encoding);
    return /\.tsx?$/.test(filePath) ? rewriteTsImportExtensions(text) : text;
  }
}

/**
 * Protobuf FQN => Typescript identifier mapping.
 */
export type SubstitutionsMap = Partial<Record<string, string>>;

const getSubstitutionType = (substitutionProperty: Symbol, typeChecker: TypeChecker) => {
  const substitutionType = typeChecker.getTypeOfSymbolAtLocation(
    substitutionProperty,
    substitutionProperty.getValueDeclarationOrThrow(),
  );

  const decode = substitutionType.getPropertyOrThrow('decode');
  const decodeType = typeChecker.getTypeOfSymbolAtLocation(decode, decode.getValueDeclarationOrThrow());
  return decodeType.getCallSignatures()[0].getReturnType();
};

/**
 * Parse a protobuf-substitutions file and return a map of protobuf FQN => Typescript identifier.
 */
export const parseSubstitutionsFile = (fileName: string): SubstitutionsMap => {
  const project = new Project({
    tsConfigFilePath: ts.findConfigFile(fileName, ts.sys.fileExists),
    compilerOptions: {
      moduleResolution: 99, // NodeNext
    },
    fileSystem: new SubstitutionsFileSystemHost(),
  });

  const sourceFile = project.addSourceFileAtPath(fileName);
  project.resolveSourceFileDependencies();
  const typeChecker = project.getTypeChecker();

  const exportSymbol = sourceFile.getDefaultExportSymbolOrThrow();
  const declarations = exportSymbol.getDeclarations();
  const exportType = typeChecker.getTypeOfSymbolAtLocation(exportSymbol, declarations[0]);

  const substitutions: Record<string, string> = {};
  for (const substitution of exportType.getProperties()) {
    const name = substitution.getName();
    const type = getSubstitutionType(substitution, typeChecker);
    substitutions[name] = type.getText();
  }

  return substitutions;
};
