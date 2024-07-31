import { readFileSync } from 'fs';
import { parse } from 'yaml';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const { _: targets, depth: maxDepth = 2, dependents: printDependents = false } = yargs(hideBin(process.argv)).argv;

const lockfile = parse(readFileSync('pnpm-lock.yaml', 'utf8'));

const dependents = {};

for (const [pkg, { dependencies = {} }] of Object.entries(lockfile.packages)) {
  for (const [dep, version] of Object.entries(dependencies)) {
    const target = `/${dep}@${version}`;
    (dependents[target] ??= []).push(pkg);
  }
}

for (const [name, { dependencies = {}, devDependencies = {} }] of Object.entries(lockfile.importers)) {
  for (const [dep, { version }] of [...Object.entries(dependencies), ...Object.entries(devDependencies)]) {
    const target = `/${dep}@${version}`;
    (dependents[target] ??= []).push(name);
  }
}

const printRevTree = (target, depth = 0) => {
  console.log('  '.repeat(depth) + target);
  if (depth < maxDepth) {
    for (const dependent of dependents[target] || []) {
      printRevTree(dependent, depth + 1);
    }
  }
};

if (printDependents) {
  for (const pkg of Object.keys(lockfile.packages)) {
    if (targets.some((target) => pkg.slice(1).startsWith(target))) {
      printRevTree(pkg);
    }
  }
}
