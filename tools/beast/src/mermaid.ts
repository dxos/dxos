//
// Copyright 2022 DXOS.org
//

// TODO(burdon): Make types relevant to ERD, etc.

type Style = {
  readonly id: string
  readonly properties: any
}

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

interface SubgraphBuilder {
  addStyle (id: string, properties: any): SubgraphBuilder
  createNode (node: Node): SubgraphBuilder
  createSubgraph ({ id, label }: Subgraph): SubgraphBuilder
  build (indent?: number): string[]
}

const ROOT_SUBGRAPH_ID = '_root_';

class SubgraphImpl implements Subgraph, SubgraphBuilder {
  private readonly _nodes = new Set<Node>();
  private readonly _styles = new Set<Style>();
  private readonly _subgraphs = new Set<SubgraphBuilder>();

  constructor (
    readonly id: string,
    readonly label?: string
  ) {}

  addStyle (id: string, properties: any) {
    this._styles.add({ id, properties });
    return this;
  }

  createSubgraph ({ id, label }: Subgraph) {
    const subgraph = new SubgraphImpl(id, label);
    this._subgraphs.add(subgraph);
    return subgraph;
  }

  createNode (node: Node) {
    this._nodes.add(node);
    return this;
  }

  build (indent = -1): string[] {
    const line = (str: string, i = indent) => ' '.repeat(i * 2) + str;

    const section = (lines: string[]) => lines.length ? lines : undefined;

    const sections = [
      section(Array.from(this._nodes.values())
        .map(node => Flowchart.renderNode(node).map(str => line(str, indent + 1))).flat()),

      section(Array.from(this._styles.values())
        .map(style => line(Flowchart.renderStyle(style), indent + 1))),

      section(Array.from(this._subgraphs.values())
        .map(subgraph => ['', subgraph.build(indent + 1)].flat()).flat())
    ].filter(Boolean).flat() as string[];

    if (indent >= 0) {
      return [
        line(`subgraph ${this.id} [${this.label ?? this.id}]`),
        sections,
        line('end')
      ].flat();
    } else {
      return sections;
    }
  }
}

type FlowchartOptions = {
  direction?: 'LR' | 'RL' | 'TD'
  curve?: 'basis' | 'bump' | 'normal' | 'step'
}

export const FlowchartDefaultOptions: FlowchartOptions = {
  direction: 'LR',
  curve: 'basis'
};

/**
 * Mermaid Flowchart builder.
 * https://mermaid.live
 * https://mermaid-js.github.io/mermaid/#/README
 */
export class Flowchart implements SubgraphBuilder {
  private readonly _classDefs = new Set<Style>();
  private readonly _linkStyles = new Set<Style>();
  private readonly _root: SubgraphBuilder = new SubgraphImpl(ROOT_SUBGRAPH_ID);
  private readonly _links = new Set<Link>();
  private readonly _config: any;

  constructor (
    private readonly options: FlowchartOptions = FlowchartDefaultOptions
  ) {
    this._config = {
      flowchart: {
        curve: this.options.curve
      }
    };
  }

  addStyle = this._root.addStyle.bind(this._root);
  createNode = this._root.createNode.bind(this._root);
  createSubgraph = this._root.createSubgraph.bind(this._root);

  addClassDef (id: string, properties: any) {
    this._classDefs.add({ id, properties });
    return this;
  }

  addLinkStyle (id: string, properties: any) {
    this._linkStyles.add({ id, properties });
    return this;
  }

  createLink (link: Link) {
    this._links.add(link);
    return this;
  }

  /**
   * Generate mermaid document.
   */
  build () {
    const section = (label: string, lines: string[]) => lines.length ? ['', `%% ${label}`, ...lines] : undefined;

    const sections = [
      section('Classes', [
        ...Array.from(this._classDefs.values()).map(classDef => Flowchart.renderClassDef(classDef)),
        ...Array.from(this._linkStyles.values()).map(style => Flowchart.renderLinkStyle(style))
      ]),
      section('Nodes', this._root.build()),
      section('Links', Array.from(this._links.values()).map(link => Flowchart.renderLink(link)))
    ].filter(Boolean);

    return [
      '```mermaid',
      Flowchart.renderDirective('init', this._config),
      '',
      `flowchart ${this.options.direction}`,
      ...sections.flat(),
      '```'
    ].flat() as string[];
  }

  render () {
    return this.build().join('\n');
  }

  //
  // Renderers
  //

  // https://mermaid-js.github.io/mermaid/#/directives
  static renderDirective (directive: string, properties: any): string {
    return `%%{ ${directive}: ${JSON.stringify(properties).replace(/"/g, '\'')} }%%`;
  }

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
