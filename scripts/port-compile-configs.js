// scripts/port-compile-configs.js
//
// Copyright 2025 DXOS.org
//

const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

const findFiles = (dir, filename, found = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findFiles(fullPath, filename, found);
    } else if (entry.name === filename) {
      found.push(fullPath);
    }
  }
  return found;
};

// Helper to convert option key and value to moon arg(s)
const optionToArgs = (key, value) => {
  // Special cases
  if (key === 'entryPoints') {
    return value.map((ep) => `--entryPoint=${ep.replace('{projectRoot}/', '')}`);
  }
  if (key === 'bundlePackages') {
    return value.map((pkg) => `--bundlePackage=${pkg}`);
  }
  if (key === 'platforms') {
    return value.map((plat) => `--platform=${plat}`);
  }
  if (key === 'alias') {
    return [`--alias='${JSON.stringify(value).replace(/'/g, "'''").replace(/"/g, '\\"')}'`];
  }
  // General cases
  if (typeof value === 'boolean') {
    return value ? [`--${key}`] : [];
  }
  if (Array.isArray(value)) {
    return value.map((v) => `--${key}=${v}`);
  }
  if (typeof value === 'object' && value !== null) {
    return [`--${key}='${JSON.stringify(value).replace(/'/g, "'''").replace(/"/g, '\\"')}'`];
  }
  // Primitive (string/number)
  return [`--${key}=${value}`];
};

const portCompileConfig = (projectJsonPath) => {
  const projectDir = path.dirname(projectJsonPath);
  const moonYmlPath = path.join(projectDir, 'moon.yml');
  const projectJson = JSON.parse(fs.readFileSync(projectJsonPath, 'utf8'));

  const options = projectJson?.targets?.compile?.options;
  if (!options) {
    return;
  } // Nothing to port

  // Collect all args
  let args = [];
  for (const [key, value] of Object.entries(options)) {
    args = args.concat(optionToArgs(key, value));
  }

  // Sort args by requested order
  const argOrder = [
    '--entryPoint=',
    '--platform=',
    '--injectGlobals',
    '--alias=',
    '--alias', // in case alias is boolean
    '--bundlePackage=',
  ];
  const getOrderIndex = (arg) => {
    for (let i = 0; i < argOrder.length; i++) {
      if (arg.startsWith(argOrder[i])) {
        return i;
      }
    }
    return argOrder.length;
  };
  args.sort((a, b) => {
    const ai = getOrderIndex(a);
    const bi = getOrderIndex(b);
    if (ai !== bi) {
      return ai - bi;
    }
    return 0;
  });

  // Read or create moon.yml
  let moon = {};
  if (fs.existsSync(moonYmlPath)) {
    moon = yaml.load(fs.readFileSync(moonYmlPath, 'utf8')) || {};
  }
  if (!moon.tasks) {
    moon.tasks = {};
  }
  if (!moon.tasks.compile) {
    moon.tasks.compile = {};
  }

  moon.tasks.compile.args = args;

  // Write back
  fs.writeFileSync(moonYmlPath, yaml.dump(moon, { lineWidth: 120 }), 'utf8');
  // console.log(`Updated: ${moonYmlPath}`);
};

const main = () => {
  const root = path.resolve(__dirname, '..');
  const projectJsons = findFiles(root, 'project.json');
  for (const pj of projectJsons) {
    portCompileConfig(pj);
  }
};

main();
