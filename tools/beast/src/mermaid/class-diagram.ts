//
// Copyright 2022 DXOS.org
//

import { Cardinality, ClassDefinition } from '../ts';
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
    const defs = Array.from(this._classes.values()).map(({ name, type, methods, properties }) => {
      const members = [
        // https://mermaid-js.github.io/mermaid/#/classDiagram?id=annotations-on-classes
        type === 'interface' ? '<interface>' : undefined,

        ...properties
          .filter(({ classDef }) => !classDef)
          .map(({ name, type }) => (type ? `  ${type} ${name}` : `  ${name}`)),

        ...methods.map(({ name }) => `  ${name}()`)
      ].filter(Boolean);

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
        .forEach(({ name: propertyName, initializer, readonly, cardinality, classDef }) => {
          const composition = initializer && readonly;
          let arrow = composition ? '*--' : '-->';
          if (cardinality !== Cardinality.Default) {
            arrow += ` "${cardinality!.toString()}"`;
          }
          lines.push(`${name} ${arrow} ${classDef!.name} : ${propertyName}`);
        });

      return lines.join('\n');
    });

    // TODO(burdon): Config or heuristic based on number of classes?
    const direction = 'TB';

    // TODO(burdon): Link.
    //  https://mermaid-js.github.io/mermaid/#/classDiagram?id=interaction

    // prettier-ignore
    return [
      '```mermaid',
      'classDiagram',
      `direction ${direction}`,
      '',
      ...defs,
      '```'
    ].flat() as string[];
  }

  render() {
    return this.build().join('\n');
  }
}
