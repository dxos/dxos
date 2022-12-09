import os from 'os';
import path from 'path';

interface Import {
  name: string;
  from: string;
  isDefault: boolean;
  dealias?: string;
}

type ImportOptions = {
  aliasOf?: string;
  isDefault?: boolean;
};

type PathLike = string | string[];

export class Imports {
  private imports: { [k: string]: Import } = {};
  use(name: string, from: PathLike, options?: ImportOptions): string;
  use(name: string[], from: PathLike, options?: ImportOptions): string[];
  use(name: string | string[], from: PathLike, options?: ImportOptions): string | string[] {
    const { aliasOf, isDefault } = { ...options };
    const { imports } = this;
    const flatFrom = Array.isArray(from) ? path.join(...from) : from;
    const names = Array.isArray(name) ? name : [name];
    names.forEach((name) => {
      imports[name] = {
        name: name,
        dealias: aliasOf,
        from: flatFrom,
        isDefault: !!isDefault
      };
    });
    return Array.isArray(name) ? names : names[0];
  }
  render(relativeTo?: PathLike) {
    const { imports } = this;
    relativeTo = Array.isArray(relativeTo) ? path.join(...relativeTo) : relativeTo;
    const relative = (p: string, relativeTo: string) => {
      const dir = path.dirname(relativeTo);
      const rel = path.relative(dir, p);
      return !!relativeTo && p[0] != '.' ? (rel[0] == '.' ? rel : './' + rel) : p;
    };
    const stripExt = (file: string) => file.split('.ts')[0];
    return Object.values(imports)
      .filter((i) => {
        return i.from + '.ts' != relativeTo;
      })
      .map(
        (i) =>
          `import ${i.isDefault ? '' : '{ '}${!!i.dealias ? `${i.dealias} as ${i.name}` : i.name}${
            i.isDefault ? '' : ' }'
          } from "${
            /^\.?\//.test(i.from)
              ? stripExt(
                  !!relativeTo
                    ? relative(i.from, Array.isArray(relativeTo) ? path.join(...relativeTo) : relativeTo)
                    : i.from
                )
              : i.from
          }";`
      )
      .join(os.EOL);
  }
  lazy(name: string, from: PathLike, o?: ImportOptions): () => string;
  lazy(names: string[], from: PathLike, o?: ImportOptions): Record<string, () => string>;
  lazy(name: string | string[], from: PathLike, o?: ImportOptions) {
    return Array.isArray(name)
      ? Object.fromEntries(name.map((n) => [n, () => this.use(n, from, o)]))
      : () => this.use(name, from, o);
  }
}
