//
// Copyright 2025 DXOS.org
//

import { Box, Spacer, Text, Transform, measureElement } from 'ink';
import React, { useRef } from 'react';

import type { VersionId } from '../lockfile';
import { ellipsis } from '../util';

export type PackageListProps = {
  packages: {
    name: string;
    version: VersionId;
    versionCount: number;
  }[];
  selectedIndex: number;
  isFocused: boolean;
  updatedPackages: string[];
};

export const PackageList = ({ packages, selectedIndex, isFocused, updatedPackages }: PackageListProps) => {
  const ref = useRef(null);
  return (
    <Box
      ref={ref}
      flexDirection='column'
      borderStyle='double'
      paddingLeft={1}
      paddingRight={1}
      flexBasis={'50%'}
      borderColor={isFocused ? 'blue' : 'white'}
      overflow='hidden'
    >
      {packages.map(({ name, version, versionCount }, idx) => {
        const { width = 0 } = ref.current ? measureElement(ref.current) : {};
        const isSelected = selectedIndex === idx;
        const isUpdated = updatedPackages.includes(name);
        return (
          <Box key={name + '@' + version} flexDirection='row' width={'100%'}>
            <Text backgroundColor={isSelected ? '#444' : 'transparent'}>
              <Transform transform={(output) => output.padEnd(width - 2, ' ')}>
                {isUpdated ? (
                  <Text color='red'>{'# '}</Text>
                ) : versionCount > 1 ? (
                  <Text color={'yellowBright'}>{'! '}</Text>
                ) : (
                  <Text color='gray'>{'  '}</Text>
                )}
                <Text bold color='white'>
                  {name}
                </Text>
                <Text color={'gray'}>@{ellipsis(version, 40)}</Text>
              </Transform>
            </Text>
            <Spacer />
          </Box>
        );
      })}
    </Box>
  );
};
