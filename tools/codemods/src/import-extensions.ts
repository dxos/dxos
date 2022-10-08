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
  
  const convert = (specifier: any) => {
    const source = specifier.value

    // Not relative
    if(!source.startsWith('.')) {
      return
    }

    if(['.js', '.ts', '.tsx', '.json'].some(ext => source.endsWith(ext))) {
      return
    }

    if(isDirectory(join(dirname(fileInfo.path), source))) {
      specifier.value = `${source}/index.js`
    } else {
      specifier.value = `${source}.js`
    }
  }

  root
    .find(j.ImportDeclaration)
    .forEach(path => {
      convert(path.node.source)
    })

  root
    .find(j.ExportAllDeclaration)
    .forEach(path => {
      convert(path.node.source)
    })

  root
    .find(j.ExportNamedDeclaration)
    .forEach(path => {
      if(path.node.source) {
        convert(path.node.source)
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