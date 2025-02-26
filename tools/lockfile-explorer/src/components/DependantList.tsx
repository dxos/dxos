//
// Copyright 2025 DXOS.org
//

import { Text, Box } from 'ink';
import React from 'react';

import {
  parsePackageId,
  type LockfileResult,
  type PackageId,
  type PackageName,
  type PackagePath,
  type VersionId,
} from '../lockfile';
import { ellipsis } from '../util/ellipsis';

export type DependantListProps = {
  dependants: [
    VersionId,
    {
      importers: PackagePath[];
      dependents: PackageId[];
    },
  ][];
  selectedPackage: PackageName;
  lockfile: LockfileResult;
  isFocused: boolean;
  selectedIndex: number;
};

export const DependantList = ({
  dependants,
  lockfile,
  isFocused,
  selectedIndex,
  selectedPackage,
}: DependantListProps) => {
  let rowBase = 0;
  return (
    <Box
      flexDirection='column'
      borderStyle='double'
      paddingLeft={1}
      paddingRight={1}
      flexBasis={'50%'}
      borderColor={isFocused ? 'blue' : 'white'}
      overflow='hidden'
    >
      {dependants.map(([version, { dependents, importers }]) => {
        const relativeSelection = selectedIndex - rowBase;
        rowBase += dependents.length + importers.length + 1;

        return (
          <Box key={version} flexDirection='column'>
            <Text color='blue' bold backgroundColor={relativeSelection === 0 ? '#444' : 'transparent'}>
              - {version}
            </Text>
            <Box paddingLeft={2} flexDirection='column'>
              {importers.map((importer, idx) => {
                const importerSpec = lockfile?.lockfile.importers[importer];
                const dep =
                  importerSpec?.dependencies?.[selectedPackage] ??
                  importerSpec?.optionalDependencies?.[selectedPackage] ??
                  importerSpec?.devDependencies?.[selectedPackage];

                const isSelected = relativeSelection === idx + 1;

                return (
                  <Text backgroundColor={isSelected ? '#444' : 'transparent'}>
                    {dep?.specifier ?? ''} <Text color='gray'>in local package</Text> {importer}
                  </Text>
                );
              })}
              {dependents.map((dependent, idx) => {
                const { name, version } = parsePackageId(dependent);

                const packageSpec = lockfile?.lockfile.snapshots[dependent];
                const dep =
                  packageSpec?.dependencies?.[selectedPackage] ??
                  packageSpec?.optionalDependencies?.[selectedPackage] ??
                  packageSpec?.devDependencies?.[selectedPackage];

                const isSelected = relativeSelection === idx + 1 + importers.length;

                return (
                  <Text backgroundColor={isSelected ? '#444' : 'transparent'}>
                    <Text color='gray'>in dependency</Text> <Text>{name}</Text>
                    <Text color='gray'>@{ellipsis(version, 40)}</Text>
                  </Text>
                );
              })}
              <Text> </Text>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};
