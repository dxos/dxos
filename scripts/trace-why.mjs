import { readFileSync } from 'node:fs';

const meta = JSON.parse(readFileSync('/tmp/dxos-trace/meta.json', 'utf8').length
  ? readFileSync('/tmp/dxos-trace/meta.json', 'utf8')
  : readFileSync('/tmp/dxos-trace/meta.json', 'utf8'));

// fall back to repo location if /tmp doesn't have it
let metaJson;
try {
  metaJson = readFileSync('/tmp/dxos-trace/meta.json', 'utf8');
} catch {
  metaJson = readFileSync(new URL('../packages/core/assistant-toolkit/.trace-imports/meta.json', import.meta.url), 'utf8');
}
const m = JSON.parse(metaJson);

const targets = process.argv.slice(2);
if (targets.length === 0) {
  console.error('Usage: node scripts/trace-why.mjs <package> [more...]');
  process.exit(1);
}

const parentsOf = {};
const allFiles = new Set(Object.keys(m.inputs));
for (const [file, info] of Object.entries(m.inputs)) {
  for (const imp of info.imports) {
    (parentsOf[imp.path] ||= new Set()).add(file);
    allFiles.add(imp.path);
  }
}
const importedFiles = new Set(Object.keys(parentsOf));
const entries = new Set([...allFiles].filter((f) => !importedFiles.has(f)));

const findShortestPath = (target) => {
  const seedFiles = new Set();
  for (const [file, info] of Object.entries(m.inputs)) {
    for (const imp of info.imports) {
      if (imp.path === target || imp.path.startsWith(target + '/')) seedFiles.add(file);
    }
  }
  if (seedFiles.size === 0) return null;
  const cameFrom = new Map();
  const queue = [];
  for (const seed of seedFiles) {
    queue.push(seed);
    cameFrom.set(seed, null);
  }
  while (queue.length) {
    const cur = queue.shift();
    if (entries.has(cur)) {
      const path = [];
      let node = cur;
      while (node !== null) {
        path.push(node);
        node = cameFrom.get(node);
      }
      return path;
    }
    for (const parent of parentsOf[cur] || []) {
      if (!cameFrom.has(parent)) {
        cameFrom.set(parent, cur);
        queue.push(parent);
      }
    }
  }
  return null;
};

for (const target of targets) {
  console.log(`\n=== Why is "${target}" reachable? ===`);
  const path = findShortestPath(target);
  if (!path) {
    console.log('  (no reference found)');
    continue;
  }
  for (let i = 0; i < path.length; i++) {
    console.log('  '.repeat(i) + path[i]);
  }
  console.log(`${'  '.repeat(path.length)}-> ${target}`);
}
