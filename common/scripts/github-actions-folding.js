/**
 * This script is used to insert `::group::` tokens into stdout when rush build is running.
 * 
 * This allows gtihub actions log viewer to group those sections in the UI.
 */

const childProcess = require('child_process');
const readline = require('readline');

const [cmd, ...args] = process.argv.slice(2);

const cspr = childProcess.spawn(cmd, args, { shell: true, stdio: ['ignore', 'pipe', 'inherit']})
const rl = readline.createInterface({ input: cspr.stdout });

let groupStarted = false;

rl.on('line', line => {
  if(line.includes('==[')) {
    if(groupStarted) {
      process.stdout.write('::endgroup::\n')
    }
    groupStarted = true
    process.stdout.write(`::group::${line}\n`)
  } else {
    process.stdout.write(line + '\n')
  }
})

cspr.on('exit', (code) => {
  if(groupStarted) {
    process.stdout.write('::endgroup::\n')
  }
  process.exit(code);
})
