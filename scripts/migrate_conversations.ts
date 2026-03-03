import fs from 'node:fs';
import path from 'node:path';

function findFiles(dir: string, pattern: RegExp, fileList: string[] = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        findFiles(filePath, pattern, fileList);
      }
    } else {
      if (pattern.test(file)) {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
}

async function migrate() {
  const rootDir = path.resolve(__dirname, '..');
  console.log(`Searching for files in ${rootDir}...`);
  const files = findFiles(rootDir, /\.conversations\.json$/);

  console.log(`Found ${files.length} files to process.`);

  for (const filePath of files) {
    console.log(`Processing ${filePath}...`);

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const json = JSON.parse(content);
      let modified = false;

      if (json.conversations && Array.isArray(json.conversations)) {
        for (const conversation of json.conversations) {
          if (conversation.prompt && Array.isArray(conversation.prompt.content)) {
            for (const message of conversation.prompt.content) {
              if (message.role === 'tool' && Array.isArray(message.content)) {
                for (const item of message.content) {
                  if (item.type === 'tool-result') {
                    if (item.isFailure === undefined) {
                      item.isFailure = false;
                      modified = true;
                    }
                  }
                }
              }
            }
          }

          if (conversation.response && Array.isArray(conversation.response)) {
            for (const item of conversation.response) {
              if (item.type === 'tool-result') {
                if (item.isFailure === undefined) {
                  item.isFailure = false;
                  modified = true;
                }
              }
            }
          }
        }
      }

      if (modified) {
        console.log(`  Updating ${filePath}...`);
        fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n');
      } else {
        console.log(`  No changes needed for ${filePath}.`);
      }
    } catch (err) {
      console.error(`  Error processing ${filePath}:`, err);
    }
  }
}

migrate().catch(console.error);
