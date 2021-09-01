#!/usr/bin/env node

const childProcess = require('child_process')

const diffs = childProcess.execSync('git diff main --name-only --cached').toString().split('\n')

const rushList = JSON.parse(childProcess.execSync('rush list --json').toString())
const projectDirs = rushList.projects.map(project => project.path)

const changedPackages = projectDirs.filter(dir => diffs.some(d => d.startsWith(dir)))

console.log(`Detected changes in ${changedPackages.length} package(s):\n\n${changedPackages.join('\n')}\n\n`)

for(const pkgPath of changedPackages) {
  console.log(`\nRunning "yarn lint --fix" in "${pkgPath}"`)
  childProcess.execSync('yarn lint --fix', {
    cwd: pkgPath,
    stdio: 'inherit'
  })
}
