//
// Copyright 2025 DXOS.org
//

import { resolve } from 'node:path';

import fuzzy from 'fuzzy';
import { Box, Text, render, useInput, useStdout } from 'ink';
import React, { type ReactNode, useEffect, useState } from 'react';

import { entries, keys } from '@dxos/util';

import { DependentList, Input, PackageList, StatusBar } from './components';
import {
  type LockfileResult,
  type PackageId,
  type PackageName,
  type PackagePath,
  type VersionId,
  type VersionSpecifier,
  findLockfile,
  loadLockfile,
  setAllToVersion,
} from './lockfile';

const App = () => {
  const { stdout } = useStdout();
  const [lockfile, setLockfile] = useState<LockfileResult | null>(null);
  const [updatedPackages, setUpdatedPackages] = useState<PackageName[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [leftSelected, setLeftSelected] = useState<number>(0);
  const [rightSelected, setRightSelected] = useState<number>(0);
  const [selectedPanel, setSelectedPanel] = useState(0);

  useEffect(() => {
    const path = findLockfile(process.argv[2] ?? process.cwd());

    void loadLockfile(path).then((lockfile) => {
      setLockfile(lockfile);
    });
  }, []);

  const filtered = fuzzy
    .filter(filter, entries(lockfile?.packageIndex.packages ?? {}), {
      extract: ([name]) => name,
    })
    .slice(0, 20)
    .flatMap(({ original: [name, { versions }] }) => {
      const versionCount = keys(versions).length;

      return entries(versions).map(([version, { dependents, importers }]) => ({
        name,
        version,
        dependents,
        importers,
        versionCount,
      }));
    });

  useEffect(() => {
    if (leftSelected >= filtered.length) {
      setLeftSelected(Math.max(0, filtered.length - 1));
    }
  }, [filtered.length]);

  const selectedPackage = filtered[leftSelected];
  const selectedPackageVersions =
    selectedPackage == null
      ? []
      : entries(lockfile?.packageIndex.packages[selectedPackage.name]?.versions ?? {}).sort(([a], [b]) =>
          a === selectedPackage.version ? -1 : b === selectedPackage.version ? 1 : 0,
        );
  const versionRowCounts = selectedPackageVersions.map(
    ([version, { dependents, importers }]) => dependents.length + importers.length + 1,
  );

  let selectedVersionRow:
    | {
        versionId: VersionId;
        dependent?: PackageId;
        importer?: PackagePath;
        row: [VersionId, { dependents: PackageId[]; importers: PackagePath[] }];
      }
    | undefined;
  let tmp = 0;
  for (let i = 0; i < selectedPackageVersions.length; i++) {
    if (rightSelected - tmp === 0) {
      selectedVersionRow = { versionId: selectedPackageVersions[i][0], row: selectedPackageVersions[i] };
      break;
    }
    tmp += 1;
    if (rightSelected - tmp < selectedPackageVersions[i][1].importers.length) {
      selectedVersionRow = {
        versionId: selectedPackageVersions[i][0],
        importer: selectedPackageVersions[i][1].importers[rightSelected - tmp - 1],
        row: selectedPackageVersions[i],
      };
      break;
    }
    tmp += selectedPackageVersions[i][1].importers.length;
    if (rightSelected - tmp < selectedPackageVersions[i][1].dependents.length) {
      selectedVersionRow = {
        versionId: selectedPackageVersions[i][0],
        dependent: selectedPackageVersions[i][1].dependents[rightSelected - tmp - 1],
        row: selectedPackageVersions[i],
      };
      break;
    }
    tmp += selectedPackageVersions[i][1].dependents.length;
  }

  const canSetAllToVersion = selectedVersionRow != null;

  useInput((input, key) => {
    if (key.upArrow) {
      if (selectedPanel === 0) {
        setLeftSelected(Math.max(0, leftSelected - 1));
      } else {
        setRightSelected(Math.max(0, rightSelected - 1));
      }
    }

    if (key.downArrow) {
      if (selectedPanel === 0) {
        setLeftSelected(Math.min(filtered.length - 1, leftSelected + 1));
      } else {
        setRightSelected(Math.min(versionRowCounts.reduce((a, b) => a + b, 0) - 1, rightSelected + 1));
      }
    }

    if (key.rightArrow || key.tab) {
      if (selectedPanel === 0) {
        setSelectedPanel(1);
        setRightSelected(0);
      }
    }

    if (key.leftArrow || key.tab) {
      if (selectedPanel === 1) {
        setSelectedPanel(0);
        let selectedSection = 0;
        for (let i = 0; i < versionRowCounts.length; i++) {
          selectedSection += versionRowCounts[i];
          if (selectedSection > rightSelected) {
            setRightSelected(i);
            break;
          }
        }
      }
    }

    if (key.ctrl && input === 's') {
      void setAllToVersionAction();
    }
  });

  const setAllToVersionSpecifier: string | undefined = (() => {
    if (!selectedVersionRow || !lockfile) {
      return undefined;
    }

    const importer = selectedVersionRow.importer || selectedVersionRow.row[1].importers[0];
    if (!importer) {
      return undefined;
    }

    const importerSpec = lockfile?.lockfile.importers[importer];
    const dep =
      importerSpec?.dependencies?.[selectedPackage.name] ??
      importerSpec?.optionalDependencies?.[selectedPackage.name] ??
      importerSpec?.devDependencies?.[selectedPackage.name];

    return dep?.specifier;
  })();

  const setAllToVersionAction = async () => {
    if (!setAllToVersionSpecifier || !lockfile) {
      return;
    }
    await setAllToVersion(lockfile, selectedPackage.name, setAllToVersionSpecifier as VersionSpecifier);
    setUpdatedPackages((updatedPackages) => [...updatedPackages, selectedPackage.name]);
  };

  const actions: { binding: string; description: ReactNode }[] = [
    ...(canSetAllToVersion
      ? [
          {
            binding: '^S',
            description: (
              <>
                Change all <Text bold>{selectedPackage.name}</Text> to <Text bold>{setAllToVersionSpecifier}</Text>
              </>
            ),
          },
        ]
      : []),
  ];

  return (
    <Box flexDirection='column' width={stdout.columns} height={stdout.rows}>
      <Box flexDirection='row' gap={1}>
        <Text color='blue'>{'>'}</Text>
        <Input value={filter} onChange={setFilter} color='blue' />
      </Box>
      <Box height={'100%'}>
        <PackageList
          packages={filtered}
          selectedIndex={leftSelected}
          isFocused={selectedPanel === 0}
          updatedPackages={updatedPackages}
        />
        {selectedPackage && selectedPackageVersions && lockfile && (
          <DependentList
            dependants={selectedPackageVersions}
            lockfile={lockfile}
            isFocused={selectedPanel === 1}
            selectedIndex={rightSelected}
            selectedPackage={selectedPackage.name}
          />
        )}
      </Box>
      <StatusBar actions={actions} statusText={lockfile?.path != null ? resolve(lockfile?.path) : ''} />
    </Box>
  );
};

export const runApp = async () => {
  render(<App />);

  // const lockfile = await loadLockfile(findLockfile(process.cwd()));
  // console.log(inspect(lockfile.packageIndex, { depth: null, colors: true }));
};
