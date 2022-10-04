import { Transform } from 'jscodeshift'

const transform: Transform = (fileInfo, api, options) => {
  const j = api.jscodeshift;

  const replaceList = [options.replace].flat()
  const root = j(fileInfo.source)

  root
    .find(j.ImportSpecifier)
    .forEach(path => {
      const identifier = path.node.imported.name
      const source = path.parent.value.source.value

      const replaceTarget = getReplaceTarget(replaceList, source, identifier)
      if(!replaceTarget) {
        return
      }

      path.parent.insertAfter(j.importDeclaration(
        [j.importSpecifier(j.identifier(identifier))],
        j.literal(replaceTarget)
      ))

      // Remove old import
      if(path.parent.value.specifiers.length === 1) {
        j(path.parent).remove()
      } else {
        j(path).remove()
      }
    })

  return root.toSource()
}

const getReplaceTarget = (replaceList: string[], source: string, identifier: string): string | undefined => {
  for(const replace of replaceList) {
    
    const [from, to] = replace.split(':')
    const [pkg, id] = from.split('#')
    
    if(source === pkg && identifier === id) {
      return to
    }
  }
}

export default transform