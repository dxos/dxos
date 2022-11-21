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
    const defs = Array.from(this._classes.values()).map(({ name, methods, properties }) => {
      const members = [
        ...properties
          .filter(({ classDef }) => !classDef)
          .map(({ name, type }) => (type ? `  ${type} ${name}` : `  ${name}`)),
        ...methods.map(({ name }) => `  ${name}()`)
      ];

      const lines = [];
      if (members.length) {
        lines.push(...[`class ${name} {`, ...members, '}']);
      } else {
        lines.push(`class ${name}`);
      }

      // TODO(burdon): Composition vs. aggregation vs. association (ref).
      // https://mermaid-js.github.io/mermaid/#/classDiagram?id=defining-relationship
      properties
        .filter(({ type }) => type === 'class')
        .forEach(({ name: propertyName, initializer, readonly, classDef }) => {
          const composition = initializer && readonly;
          const arrow = composition ? '*--' : '-->';
          lines.push(`${name} ${arrow} ${classDef!.name} : ${propertyName}`);
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
