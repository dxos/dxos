#!/usr/bin/env node

// Webstorm File Watcher script to fix imports on-the-fly.
// Settings > Tools > File Watchers > [+ custom] > TypeScript
// Arguments: $FilePath$

const fs = require('fs');
const filePath = process.argv[2]; // File path is passed as an argument.

const content = fs.readFileSync(filePath, 'utf8');
const updatedContent = content.replace(new RegExp(/(@dxos\/.+)\/src(.+)/, 'g'), (...matches) => [matches[1], matches[2]].join(''));
if (content !== updatedContent) {
  fs.writeFileSync(filePath, updatedContent, 'utf8');
  console.log(`Updated file: ${filePath}`);
}
