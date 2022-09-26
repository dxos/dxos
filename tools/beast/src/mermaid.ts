//
// Copyright 2022 DXOS.org
//

// TODO(burdon): Make types relevant to ERD, etc.

type Node = {
  readonly id: string
  readonly label?: string
  readonly className?: string
  readonly style?: string
  readonly href?: string
}

type Link = {
  readonly source: string
  readonly target: string
}

type Subgraph = {
  readonly id: string
  readonly label?: string
  readonly style?: string
}

type Style = {
  readonly id: string
  readonly properties: any
}

const ROOT_SUBGRAPH_ID = '_root_';

class SubgraphImpl implements Subgraph {
  private readonly _nodes = new Set<Node>();
  private readonly _styles = new Set<Style>();
  private readonly _subgraphs = new Set<SubgraphImpl>();

  constructor (
    readonly id: string,
    readonly label?: string
  ) {}

  addStyle(id: string, properties: any) {
    this._styles.add({ id, properties });
    return this;
  }

  createSubgraph ({ id, label }: Subgraph): SubgraphImpl {
    const subgraph = new SubgraphImpl(id, label);
    this._subgraphs.add(subgraph);
    return subgraph;
  }

  createNode (node: Node): SubgraphImpl {
    this._nodes.add(node);
    return this;
  }

  render (indent = -1): string[] {
    const line = (str: string, i = indent) => ' '.repeat(i * 2) + str;

    const section = (lines: string[]) => lines.length ? lines : undefined;

    const sections = [
      section(Array.from(this._nodes.values())
        .map(node => Flowchart.renderNode(node).map(str => line(str, indent + 1))).flat()),

      section(Array.from(this._styles.values())
        .map(style => line(Flowchart.renderStyle(style), indent + 1))),

      section(Array.from(this._subgraphs.values())
        .map(subgraph => ['', subgraph.render(indent + 1)].flat()).flat())
    ].filter(Boolean).flat() as string[];

    if (indent >= 0) {
      return [
        line(`subgraph ${this.id} [${this.label ?? this.id}]`),
        sections,
        line(`end`)
      ].flat();
    } else {
      return sections;
    }
  }
}

type FlowchartOptions = {
  direction?: 'LR' | 'RL' | 'TD'
  curve?: 'basis' | 'normal'
}

/**
 * Mermaid Flowchart builder.
 * https://mermaid.live
 * https://mermaid-js.github.io/mermaid/#/README
 */
// TODO(burdon): Integrate into processor.
export class Flowchart {
  private readonly _classDefs = new Set<Style>();
  private readonly _linkStyles = new Set<Style>();
  private readonly _root: SubgraphImpl = new SubgraphImpl(ROOT_SUBGRAPH_ID);
  private readonly _links = new Set<Link>();

  constructor (
    private readonly options: FlowchartOptions = {}
  ) {}

  addClassDef(id: string, properties: any) {
    this._classDefs.add({ id, properties });
    return this;
  }

  addLinkStyle(id: string, properties: any) {
    this._linkStyles.add({ id, properties });
    return this;
  }

  createSubgraph (subgraph: Subgraph) {
    return this._root.createSubgraph(subgraph);
  }

  createNode (node: Node): SubgraphImpl {
    return this._root.createNode(node);
  }

  createLink (link: Link) {
    this._links.add(link);
    return this;
  }

  /**
   * Generate mermaid document.
   */
  // TODO(burdon): Normalize with subgraph builder.
  build () {
    // TODO(burdon): Defaults object.
    const init = {
      flowchart: {
        curve: this.options.curve ?? 'basis'
      }
    }

    const section = (label: string, lines: string[]) => lines.length ? ['', label, ...lines]: undefined;

    const sections = [
      section('%% Classes', [
        ...Array.from(this._classDefs.values()).map(classDef => Flowchart.renderClassDef(classDef)),
        ...Array.from(this._linkStyles.values()).map(style => Flowchart.renderLinkStyle(style)),
      ]),
      section('%% Nodes', this._root.render()),
      section('%% Links', Array.from(this._links.values()).map(link => Flowchart.renderLink(link)))
    ].filter(Boolean);

    // TODO(burdon): Optional sections.
    const lines = [
      '```mermaid',
      `%%{ init: ${JSON.stringify(init).replace(/"/g, '\'')} }%%\n`,
      `flowchart ${this.options.direction ?? 'LR'}`,
      ...sections.flat(),
      '```'
    ];

    return lines.join('\n');
  }

  //
  // Renderers
  //

  static renderProperties (properties: any): string {
    return Object.entries(properties).map(([key, value]) => `${key}:${value}`).join(',');
  }

  static renderStyle ({ id, properties }: Style): string {
    return `style ${id} ${Flowchart.renderProperties(properties)}`;
  }

  static renderLinkStyle ({ id, properties }: Style): string {
    return `linkStyle ${id} ${Flowchart.renderProperties(properties)}`;
  }

  // https://mermaid-js.github.io/mermaid/#/flowchart?id=styling-and-classes
  static renderClassDef ({ id, properties }: Style): string {
    return `classDef ${id} ${Flowchart.renderProperties(properties)}`;
  }

  static renderNode (node: Node): string[] {
    const line = [
      node.id,
      node.label && `(${node.label})`,
      node.className && `:::${node.className}`
    ].filter(Boolean).join('');

    return [
      line,

      // https://mermaid-js.github.io/mermaid/#/flowchart?id=interaction
      node.href && `click ${node.id} "${node.href}"`
    ].filter(Boolean) as string[];
  }

  static renderLink (link: Link): string {
    return `${link.source} --> ${link.target}`;
  }
}
