import React, { useState, useEffect, useRef, type ReactNode } from 'react';
import { render, Text, Box, useStdout, useInput, Transform, measureElement, Spacer, Newline } from 'ink';
import {
  findLockfile,
  loadLockfile,
  parsePackageId,
  setAllToVersion,
  type LockfileResult,
  type PackageId,
  type PackageName,
  type PackagePath,
  type VersionId,
  type VersionSpecifier,
} from './lockfile';
import { Input } from './components/Input';
import fuzzy from 'fuzzy';
import { entries, keys } from './util/object';
import { dirname, resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';

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

    loadLockfile(path).then((lockfile) => {
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

  const listContainerRef = useRef(null);

  const selectedPackage = filtered[leftSelected];
  const selectedPackageVersions =
    selectedPackage == null
      ? []
      : entries(lockfile?.packageIndex.packages[selectedPackage.name]?.versions ?? {}).sort(([a], [b]) =>
          a === selectedPackage.version ? -1 : b === selectedPackage.version ? 1 : 0,
        );
  const versionRowCounts = selectedPackageVersions.map(([version, { dependents, importers }]) => {
    return dependents.length + importers.length + 1;
  });

  let selectedVersionRow:
      | {
          versionId: VersionId;
          dependent?: PackageId;
          importer?: PackagePath;
          row: [VersionId, { dependents: PackageId[]; importers: PackagePath[] }];
        }
      | undefined = undefined,
    tmp = 0;
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
      setAllToVersionAction();
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
        <Box
          ref={listContainerRef}
          flexDirection='column'
          borderStyle='double'
          paddingLeft={1}
          paddingRight={1}
          flexBasis={'50%'}
          borderColor={selectedPanel === 0 ? 'blue' : 'white'}
          overflow='hidden'
        >
          {filtered.map(({ name, version, dependents, importers, versionCount }, idx) => {
            const { width = 0, height = 0 } = listContainerRef.current ? measureElement(listContainerRef.current) : {};
            const isSelected = leftSelected === idx;
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
        <Box
          flexDirection='column'
          borderStyle='double'
          paddingLeft={1}
          paddingRight={1}
          flexBasis={'50%'}
          borderColor={selectedPanel === 1 ? 'blue' : 'white'}
          overflow='hidden'
        >
          {selectedPackage &&
            selectedPackageVersions &&
            (() => {
              let rowBase = 0;

              return (
                <>
                  {selectedPackageVersions.map(([version, { dependents, importers }]) => {
                    const relativeSelection = rightSelected - rowBase;
                    rowBase += dependents.length + importers.length + 1;

                    return (
                      <Box key={version} flexDirection='column' paddingBottom={1}>
                        <Text color='blue' bold backgroundColor={relativeSelection === 0 ? '#444' : 'transparent'}>
                          - {version}
                        </Text>
                        <Box paddingLeft={2} flexDirection='column'>
                          {importers.map((importer, idx) => {
                            const importerSpec = lockfile?.lockfile.importers[importer];
                            const dep =
                              importerSpec?.dependencies?.[selectedPackage.name] ??
                              importerSpec?.optionalDependencies?.[selectedPackage.name] ??
                              importerSpec?.devDependencies?.[selectedPackage.name];

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
                              packageSpec?.dependencies?.[selectedPackage.name] ??
                              packageSpec?.optionalDependencies?.[selectedPackage.name] ??
                              packageSpec?.devDependencies?.[selectedPackage.name];

                            const isSelected = relativeSelection === idx + 1 + importers.length;

                            return (
                              <Text backgroundColor={isSelected ? '#444' : 'transparent'}>
                                <Text color='gray'>in dependency</Text> <Text>{name}</Text>
                                <Text color='gray'>@{ellipsis(version, 40)}</Text>
                              </Text>
                            );
                          })}
                        </Box>
                      </Box>
                    );
                  })}
                </>
              );
            })()}
        </Box>
      </Box>
      <Box flexDirection='row'>
        {actions.map(({ binding, description }) => (
          <Text>
            <Text bold>[{binding}]</Text> <Text color='gray'>{description}</Text>
          </Text>
        ))}
        <Text bold>{' | '}</Text>
        <Text color='gray'>{lockfile?.path != null ? resolve(lockfile?.path) : ''}</Text>
      </Box>
    </Box>
  );
};

export const runApp = async () => {
  render(<App />);

  // const lockfile = await loadLockfile(findLockfile(process.cwd()));
  // console.log(inspect(lockfile.packageIndex, { depth: null, colors: true }));
};

const ellipsis = (text: string, length: number) => (text.length > length ? text.slice(0, length) + '...' : text);
