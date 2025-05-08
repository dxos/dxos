#!/usr/bin/env node

// Webstorm File Watcher script to fix imports on-the-fly.
// Settings > Tools > File Watchers > [+ custom] > TypeScript (and JSX)
// Arguments: $FilePath$

const fs = require('fs');
const filePath = process.argv[2]; // File path is passed as an argument.

const regex = /import\s+(?:(?:\{[^}]*\}|\*)\s+from\s+)?['"](@[^'"]+)\/src(?:\/[^'"]*)?['"]/gm;

const source = fs.readFileSync(filePath, 'utf8');
const updated = source.replace(regex, (match, pkg) => {
  return match.replace(`${pkg}/src`, pkg);
});

if (source !== updated) {
  fs.writeFileSync(filePath, updated, 'utf8');
  console.log(`Updated file: ${filePath}`);
} else {
  console.log('OK', Date.now());
}
