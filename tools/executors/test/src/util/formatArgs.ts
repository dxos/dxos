export type ArgsInput =
  | undefined
  | string
  | number
  | boolean
  | ArgsInput[]
  | { [key: string]: boolean | undefined }

/**
 * Formats argv to a string array.
 * 
 * NOTE: Objects are treated as conditional arguments, where the key is the argument and the value is the condition.
 * 
 * @param input 
 * @returns 
 */
export const formatArgs = (input: ArgsInput[]) => {
  const args: string[] = []

  for(const item of input) {
    switch(typeof item) {
      case 'string':
        args.push(item)
        break
      case 'number':
        args.push(item.toString())
        break
      case 'boolean':
        if(item === true) {
          throw new Error('`true` (boolean value) is not a valid argument')
        }
        break
      case 'object':
        if(Array.isArray(item)) {
          args.push(...formatArgs(item))
        } else if(item !== null) {
          for(const [key, value] of Object.entries(item)) {
            if(value) {
              args.push(key)
            }
          }
        }
    }
  }

  return args
}