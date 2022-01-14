/**
 * This script is used to insert `::group::` tokens into stdout when rush build is running.
 * 
 * This allows gtihub actions log viewer to group those sections in the UI.
 */

const childProcess = require('child_process');
const readline = require('readline');
const fs = require('fs');

fs.rmSync('./failure-summary.log');

const [cmd, ...args] = process.argv.slice(2);

const cspr = childProcess.spawn(cmd, args, { shell: true, stdio: ['ignore', 'pipe', 'pipe']})
const rl = readline.createInterface({ input: cspr.stdout });
const rlErr = readline.createInterface({ input: cspr.stderr });

let groupStarted = false;
let linesInCurrentGroup = [];

rl.on('line', line => {
  if(line.includes('==[')) {
    if(groupStarted) {
      process.stdout.write('::endgroup::\n')
    }
    groupStarted = true
    process.stdout.write(`::group::${line}\n`)
    linesInCurrentGroup = [];
  } else {
    process.stdout.write(line + '\n')
  }

  linesInCurrentGroup.push(line);
})

rlErr.on('line', line => {
  process.stderr.write(line + '\n');

  linesInCurrentGroup.push(line);

  if(line.trim().endsWith('failed to build.')) {
      fs.appendFileSync('./failure-summary.log', linesInCurrentGroup.join('\n') + '\n');
      linesInCurrentGroup = []
  }
})

cspr.on('exit', (code) => {
  if(groupStarted) {
    process.stdout.write('::endgroup::\n')
  }
  process.exit(code);
})
