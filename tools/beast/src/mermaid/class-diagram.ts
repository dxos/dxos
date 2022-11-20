//
// Copyright 2022 DXOS.org
//

import { ClassDefinition } from '../ts';
import { Diagram } from './diagram';

/**
 * https://mermaid-js.github.io/mermaid/#/classDiagram
 */
export class ClassDiagram implements Diagram {
  private readonly _classes = new Map<string, ClassDefinition>();

  addClass(def: ClassDefinition) {
    this._classes.set(def.name, def);
    return this;
  }

  build(): string[] {
    const defs = Array.from(this._classes.values()).map(({ name, properties }) => {
      const lines = [];
      const literals = properties.filter(({ clazz }) => !clazz);
      if (literals.length) {
        lines.push(...[`class ${name} {`, ...literals.map(({ property, type }) => `  ${type} ${property}`), '}']);
      } else {
        lines.push(`class ${name}`);
      }

      // https://mermaid-js.github.io/mermaid/#/classDiagram?id=defining-relationship
      properties
        .filter(({ type }) => type === 'class')
        .forEach(({ property, clazz }) => {
          lines.push(`${clazz!.name} --o ${name} : ${property}`);
        });

      return lines.join('\n');
    });

    // prettier-ignore
    return [
      '```mermaid',
      'classDiagram',
      '',
      ...defs,
      '```'
    ].flat() as string[];
  }

  render() {
    return this.build().join('\n');
  }
}
