import { statSync } from 'fs';
import { Transform } from 'jscodeshift'
import { dirname, join } from 'path';

/*

Adds ESM-style extensions to imports

*/

const transform: Transform = (fileInfo, api, options) => {
  if (fileInfo.path.includes('dist/') || fileInfo.path.includes('node_modules/')) {
    return null
  }

  // Only process sources.
  if(!fileInfo.path.includes('src')) {
    return null
  }

  const j = api.jscodeshift;
  const root = j(fileInfo.source)

  const getFirstNode = () => root.find(j.Program).get('body', 0).node;

  // Save the comments attached to the first node
  const firstNode = getFirstNode();
  const { comments } = firstNode;

  root
    .find(j.ImportSpecifier)
    .forEach(path => {
      const source = path.parent.value.source.value

      // Not relative
      if(!source.startsWith('.')) {
        return
      }

      if(['.js', '.ts', '.tsx'].some(ext => source.endsWith(ext))) {
        return
      }

      if(isDirectory(join(dirname(fileInfo.path), source))) {
        path.parent.value.source.value = `${source}/index.js`
      } else {
        path.parent.value.source.value = `${source}.js`
      }
    })

  // If the first node has been modified or deleted, reattach the comments
  const firstNode2 = getFirstNode();
  if (firstNode2 !== firstNode) {
    firstNode2.comments = comments;
  }

  return root.toSource({ quote: 'single' })
}

const isDirectory = (path: string) => {
  try {
    return statSync(path).isDirectory()
  } catch (e) {
    return false
  }
}

export default transform