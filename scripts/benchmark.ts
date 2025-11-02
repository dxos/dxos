//
// Copyright 2024 DXOS.org
//

import { execSync } from 'child_process';

// vite-node ./scripts/benchmark.ts

function runStep(name: string, command: string) {
  console.log(`\n🔧 ${name}`);
  const start = performance.now();
  execSync(command, { stdio: 'inherit' });
  const end = performance.now();
  const seconds = ((end - start) / 1000).toFixed(2);
  console.log(`⏱️ ${name} took ${seconds}s`);
  return { name, seconds };
}

const results: { name: string; seconds: string }[] = [];

// TODO(wittjosiah): Remove or update for moon.
results.push(runStep('Clean Nx Cache', 'npx nx reset'));
results.push(runStep('pnpm Install', 'pnpm install'));
results.push(runStep('TypeScript Full Check', 'npx tsc -p tsconfig.all.json --noEmit'));
results.push(runStep('Build All', 'npx nx run-many --target=build --all --parallel'));
results.push(runStep('Vite Build (composer-app)', 'npx nx run composer-app:build'));
results.push(runStep('Bundle (composer-app)', 'npx nx run composer-app:bundle'));

console.log('\n📊 Benchmark Summary');
results.forEach((r) => console.log(`${r.name.padEnd(30)} → ${r.seconds}s`));
