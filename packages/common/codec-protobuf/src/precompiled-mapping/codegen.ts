const Ref = Symbol('Ref')

interface Ref {
  [Ref]: true
  value: any
}

export function ref(value: any): Ref {
  return {
    [Ref]: true,
    value
  }
}

function isRef(value: any): value is Ref {
  return value[Ref] === true;
}

export function codegen(args: string[], gen: (c: (parts: TemplateStringsArray, ...args: any[]) => void) => void, ctx: Record<string, any> = {}): (...args: any[]) => any {
  const newCtx = { ...ctx }
  let nextAnnon = 1;

  let buf = ''
  gen((parts, ...args) => {
    const preprocessArg = (arg: any) => {
      if(isRef(arg)) {
        const name = `anon${nextAnnon++}`;
        newCtx[name] = arg.value;
        return name
      } else {
        return arg;
      }
    }
    buf += parts.map((s, i) => s + (i < args.length ? preprocessArg(args[i]) : '')).join('') + '\n'
  })

  const code = `return (${args.join(', ')}) => {\n${buf}\n}`

  // console.log(code)

  return Function(...Object.keys(newCtx), code)(...Object.values(newCtx))
}