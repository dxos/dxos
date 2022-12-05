const fs = require('fs');
const { projects } = require('./workspace.json');

for(const project of Object.values(projects) ) {
  const manifest = JSON.parse(fs.readFileSync(`${project}/package.json`));
  if(manifest.publishConfig?.types) {
    manifest.types = manifest.publishConfig.types;
    delete manifest.publishConfig.types;
    fs.writeFileSync(`${project}/package.json`, JSON.stringify(manifest, null, 2));
  }
}