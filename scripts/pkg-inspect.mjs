#!/usr/bin/env node

import 'zx/globals';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { highlight } from 'cli-highlight';
import { fetch } from 'zx';
import semver from 'semver';

const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 <packageName[@version]> [options]')
  .example('$0 effect', 'List all versions with details')
  .example('$0 effect@1.2.3', 'Get info about a specific version')
  .example('$0 effect@1.2.3 --manifest', 'Display full manifest in pretty JSON')
  .example('$0 @effect/vitest --peer effect@3.13.3', 'Filter versions compatible with effect@3.13.3')
  .option('manifest', {
    type: 'boolean',
    description: 'Print full manifest in pretty JSON format',
  })
  .option('peer', {
    type: 'string',
    description: 'Filter versions compatible with the specified peer dependency (e.g., effect@3.13.3)',
  })
  .help().argv;

/**
 * Creates a styled label with white text on colored background
 * @param {string} text - Text to display in the label
 * @param {string} bgColor - Background color for the label
 * @returns {string} - Styled label
 */
function createLabel(text, bgColor) {
  return chalk.white.bgHex(bgColor)(` ${text} `);
}

/**
 * Parse package name and version from input
 * @param {string} input - Package name with optional version
 * @returns {Object} - { name, version }
 */
function parsePackageInput(input) {
  const match = input.match(/^(@?[^@]+)(?:@(.+))?$/);
  if (!match) {
    console.error(chalk.red('Invalid package name format'));
    process.exit(1);
  }
  return {
    name: match[1],
    version: match[2] || null,
  };
}

/**
 * Parse peer dependency option
 * @param {string} peerOption - The peer option string (e.g., 'effect@3.13.3')
 * @returns {Object} - { name, version }
 */
function parsePeerOption(peerOption) {
  const match = peerOption.match(/^(@?[^@]+)@(.+)$/);
  if (!match) {
    console.error(chalk.red('Invalid peer dependency format. Expected format: package@version'));
    process.exit(1);
  }
  return {
    name: match[1],
    version: match[2],
  };
}

/**
 * Fetch package information from npm registry
 * @param {string} packageName - Name of the package
 * @returns {Promise<Object>} - Package metadata
 */
async function fetchPackageInfo(packageName) {
  const url = `https://registry.npmjs.org/${packageName}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch package info: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(chalk.red(`Error fetching package info: ${error.message}`));
    process.exit(1);
  }
}

/**
 * Detect module type (ESM/CJS) from package.json
 * @param {Object} packageJson - Package manifest
 * @returns {string} - Module type description
 */
function detectModuleType(packageJson) {
  const types = [];

  if (packageJson.type === 'module') {
    types.push('ESM (primary)');
  } else {
    types.push('CJS (primary)');
  }

  if (packageJson.main && packageJson.module) {
    types.push('Dual ESM/CJS');
  } else if (packageJson.module || packageJson.exports?.['.']?.import) {
    if (!types.includes('ESM (primary)')) types.push('ESM');
  }

  return types.join(', ') || 'Unknown';
}

/**
 * Detect TypeScript support
 * @param {Object} packageJson - Package manifest
 * @returns {string} - TypeScript support description
 */
function detectTypeScriptSupport(packageJson) {
  if (packageJson.types || packageJson.typings || packageJson.exports?.['.']?.types) {
    return 'Built-in TypeScript declarations';
  }

  // Could check DefinitelyTyped, but would require an additional API call
  return 'No built-in types';
}

/**
 * Check if a package has types in DefinitelyTyped
 * @param {string} packageName - Name of the package
 * @returns {Promise<boolean>} - Whether the package has types in DefinitelyTyped
 */
async function hasDefinitelyTypedTypes(packageName) {
  // Strip scope if present
  const nameWithoutScope = packageName.replace(/^@[^/]+\//, '');
  const dtPackageName = `@types/${nameWithoutScope}`;

  try {
    const url = `https://registry.npmjs.org/${dtPackageName}`;
    const response = await fetch(url);
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Display version list with details
 * @param {Object} packageData - Full package metadata
 * @param {Object|null} peerDep - Peer dependency to filter by (null if not filtering)
 */
async function displayVersionList(packageData, peerDep = null) {
  const { name, versions, time, 'dist-tags': distTags } = packageData;

  // Check if the package has DefinitelyTyped types
  const hasDTTypes = await hasDefinitelyTypedTypes(name);

  console.log(chalk.bold.blue(`\nPackage: ${name}`));

  if (peerDep) {
    console.log(chalk.bold.yellow(`Filtering versions compatible with ${peerDep.name}@${peerDep.version}`));
  }

  console.log(chalk.bold(`\nDist Tags:`));

  for (const [tag, version] of Object.entries(distTags)) {
    console.log(`  ${chalk.magenta(tag)}: ${version}`);
  }

  // Sort versions by publish date (newest first)
  const versionEntries = Object.entries(versions)
    .map(([version, manifest]) => ({
      version,
      manifest,
      published: time[version] || 'Unknown',
      major: parseInt(version.split('.')[0]),
    }))
    .sort((a, b) => new Date(b.published) - new Date(a.published));

  // Filter versions by peer dependency compatibility if specified
  const filteredVersionEntries = peerDep
    ? versionEntries.filter(({ manifest }) => isCompatibleWithPeer(manifest, peerDep.name, peerDep.version))
    : versionEntries;

  if (peerDep && filteredVersionEntries.length === 0) {
    console.log(chalk.red(`\nNo versions found that are compatible with ${peerDep.name}@${peerDep.version}`));
    return;
  }

  // Find the major versions in this package
  const majorVersions = [...new Set(filteredVersionEntries.map((entry) => entry.major))].sort((a, b) => b - a);

  // Use fixed padding of 9 characters for version numbers
  const VERSION_PADDING = 9;

  // Display the 10 latest versions
  console.log(chalk.bold(`\nLatest versions (10):`));
  displayVersionGroup(filteredVersionEntries.slice(0, 10), VERSION_PADDING, distTags, hasDTTypes);

  // Display 3 latest versions for each major version (up to 5 major versions)
  // Skip the current major as it's likely included in the latest 10
  for (let i = 1; i < Math.min(6, majorVersions.length); i++) {
    const major = majorVersions[i];
    const majorVersionEntries = filteredVersionEntries.filter((entry) => entry.major === major).slice(0, 3);

    if (majorVersionEntries.length > 0) {
      console.log(chalk.bold.yellow(`\nVersion ${major}.x (latest 3):`));
      displayVersionGroup(majorVersionEntries, VERSION_PADDING, distTags, hasDTTypes);
    }
  }
}

/**
 * Display a group of versions with consistent formatting
 * @param {Array} versionEntries - Array of version entry objects
 * @param {number} versionPadding - Number of characters to pad version strings
 * @param {Object} distTags - Dist tags object from package data
 * @param {boolean} hasDTTypes - Whether the package has DefinitelyTyped types
 */
function displayVersionGroup(versionEntries, versionPadding, distTags, hasDTTypes) {
  for (const { version, manifest, published } of versionEntries) {
    // Format the date with consistent padding
    const publishDate = new Date(published).toISOString().split('T')[0];

    // Pad the version number to fixed length
    const paddedVersion = version.padEnd(versionPadding);

    // Create module type and TypeScript support labels
    const labels = [];

    // Module type labels
    if (manifest.type === 'module' || manifest.module || manifest.exports?.['.']?.import) {
      labels.push(createLabel('ESM', '#4A9E90')); // Teal for ESM
    }

    if (!manifest.type || manifest.type === 'commonjs' || manifest.main) {
      labels.push(createLabel('CJS', '#8250DF')); // Purple for CJS
    }

    // TypeScript support labels
    if (manifest.types || manifest.typings || manifest.exports?.['.']?.types) {
      labels.push(createLabel('TS', '#3178C6')); // TypeScript blue for built-in types
    } else if (hasDTTypes) {
      labels.push(createLabel('DTS', '#CB3837')); // npm red for DT types
    }

    // Find which channels/tags this version belongs to
    const tags = Object.entries(distTags)
      .filter(([_, v]) => v === version)
      .map(([tag]) => `[${chalk.magenta(tag)}]`);

    const tagStr = tags.length > 0 ? ' ' + tags.join(' ') : '';

    // Format the version line with smaller circle bullet, padded version, date, labels, and tags
    console.log(`• ${chalk.green(paddedVersion)} - ${chalk.gray(publishDate)} ${labels.join(' ')}${tagStr}`);
  }
}

/**
 * Display specific version details
 * @param {Object} packageData - Full package metadata
 * @param {string} version - Specific version to display
 * @param {boolean} showFullManifest - Whether to show full manifest
 */
async function displayVersionDetails(packageData, version, showFullManifest) {
  if (!packageData.versions[version]) {
    console.error(chalk.red(`Version ${version} not found`));
    process.exit(1);
  }

  const manifest = packageData.versions[version];
  const publishDate = new Date(packageData.time[version] || '').toISOString().split('T')[0];

  if (showFullManifest) {
    // Output only pure JSON with no other text and no highlighting
    // This ensures the output can be piped to other JSON processing tools
    console.log(JSON.stringify(manifest, null, 2));
    return;
  }

  // Check if the package has DefinitelyTyped types
  const hasDTTypes = await hasDefinitelyTypedTypes(packageData.name);

  // Pad the version number to 9 characters
  const paddedVersion = version.padEnd(9);

  console.log(chalk.bold.blue(`\nPackage: ${packageData.name}@${paddedVersion}`));
  console.log(chalk.gray(`Published: ${publishDate}`));

  // Create module type and TypeScript support labels
  const labels = [];

  // Module type labels
  if (manifest.type === 'module' || manifest.module || manifest.exports?.['.']?.import) {
    labels.push(createLabel('ESM', '#4A9E90')); // Teal for ESM
  }

  if (!manifest.type || manifest.type === 'commonjs' || manifest.main) {
    labels.push(createLabel('CJS', '#8250DF')); // Purple for CJS
  }

  // TypeScript support labels
  if (manifest.types || manifest.typings || manifest.exports?.['.']?.types) {
    labels.push(createLabel('TS', '#3178C6')); // TypeScript blue for built-in types
  } else if (hasDTTypes) {
    labels.push(createLabel('DTS', '#CB3837')); // npm red for DT types
  }

  console.log(`Module Format: ${labels.join(' ')}`);

  if (manifest.dependencies && Object.keys(manifest.dependencies).length > 0) {
    console.log(chalk.bold('\nDependencies:'));
    for (const [dep, constraint] of Object.entries(manifest.dependencies)) {
      // Pad dependency names for better alignment
      const paddedDep = dep.padEnd(25);
      console.log(`  ${chalk.cyan(paddedDep)} ${constraint}`);
    }
  }

  if (manifest.peerDependencies && Object.keys(manifest.peerDependencies).length > 0) {
    console.log(chalk.bold('\nPeer Dependencies:'));
    for (const [dep, constraint] of Object.entries(manifest.peerDependencies)) {
      const paddedDep = dep.padEnd(25);
      console.log(`  ${chalk.cyan(paddedDep)} ${constraint}`);
    }
  }

  if (manifest.optionalDependencies && Object.keys(manifest.optionalDependencies).length > 0) {
    console.log(chalk.bold('\nOptional Dependencies:'));
    for (const [dep, constraint] of Object.entries(manifest.optionalDependencies)) {
      const paddedDep = dep.padEnd(25);
      console.log(`  ${chalk.cyan(paddedDep)} ${constraint}`);
    }
  }
}

/**
 * Check if a version is compatible with the specified peer dependency
 * @param {Object} manifest - Package manifest
 * @param {string} peerName - Name of the peer dependency
 * @param {string} peerVersion - Version of the peer dependency
 * @returns {boolean} - Whether the version is compatible
 */
function isCompatibleWithPeer(manifest, peerName, peerVersion) {
  if (!manifest.peerDependencies || !manifest.peerDependencies[peerName]) {
    return false;
  }

  const peerRange = manifest.peerDependencies[peerName];
  return semver.satisfies(peerVersion, peerRange, { includePrerelease: true });
}

async function main() {
  if (argv._.length !== 1) {
    console.error(chalk.red('Please provide a package name'));
    process.exit(1);
  }

  const input = String(argv._[0]);
  const { name, version } = parsePackageInput(input);

  // Validate that --manifest is only used with a specific version
  if (argv.manifest && !version) {
    console.error(chalk.red('Error: --manifest option requires a specific version (e.g., effect@1.2.3 --manifest)'));
    process.exit(1);
  }

  // Parse peer dependency option if provided
  let peerDep = null;
  if (argv.peer) {
    peerDep = parsePeerOption(argv.peer);

    // Peer filtering only works when showing all versions, not a specific version
    if (version) {
      console.error(chalk.red('Error: --peer option cannot be used with a specific version'));
      process.exit(1);
    }
  }

  // Skip the "Fetching information" message if we're outputting manifest
  if (!argv.manifest) {
    console.log(chalk.gray(`Fetching information for ${name}${version ? '@' + version : ''}...`));
  }

  const packageData = await fetchPackageInfo(name);

  if (version) {
    await displayVersionDetails(packageData, version, argv.manifest);
  } else {
    await displayVersionList(packageData, peerDep);
  }
}

// Run the script
main().catch((error) => {
  console.error(chalk.red(`Error: ${error.message}`));
  process.exit(1);
});
