import { Transform } from 'jscodeshift'

const transform: Transform = (fileInfo, api, options) => {
  if (fileInfo.path.includes('dist/') || fileInfo.path.includes('node_modules/')) {
    return null
  }

  const j = api.jscodeshift;
  const replaceList = [options.replace].flat()
  const root = j(fileInfo.source)

  const getFirstNode = () => root.find(j.Program).get('body', 0).node;

  // Save the comments attached to the first node
  const firstNode = getFirstNode();
  const { comments } = firstNode;

  root
    .find(j.ImportSpecifier)
    .forEach(path => {
      const identifier = path.node.imported.name
      const source = path.parent.value.source.value

      const replaceTarget = getReplaceTarget(replaceList, source, identifier)
      if (!replaceTarget) {
        return
      }

      path.parent.insertAfter(j.importDeclaration(
        [j.importSpecifier(j.identifier(identifier))],
        j.literal(replaceTarget)
      ))

      // Remove old import
      if (path.parent.value.specifiers.length === 1) {
        j(path.parent).remove()
      } else {
        j(path).remove()
      }
    })

  // If the first node has been modified or deleted, reattach the comments
  const firstNode2 = getFirstNode();
  if (firstNode2 !== firstNode) {
    firstNode2.comments = comments;
  }

  return root.toSource({ quote: 'single' })
}

const getReplaceTarget = (replaceList: string[], source: string, identifier: string): string | undefined => {
  for (const replace of replaceList) {

    const [from, to] = replace.split(':')
    const [pkg, id] = from.split('#')

    if (source === pkg && (identifier === id || id === '*')) {
      return to
    }
  }
}

export default transform