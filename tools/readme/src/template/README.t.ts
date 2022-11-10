import { TemplateFunction, text } from '@dxos/plate';
import { Input } from './index';

const template: TemplateFunction<Input> = ({ input }) => {
  const {
    name,
    description,
    usage,
    installCommand,
    quickStartUrl,
    guideUrl,
    apiReferenceUrl,
    dependencyDiagramUrl,
    codeCoverageUrl
  } = { ...input };
  return text`
  # ${name}
  ${description}

  ## Installation
  \`\`\`bash
  ${installCommand}
  \`\`\`

  ## Usage
  ${usage}

  ## Documentation
  ${quickStartUrl && `- [Quick Start](${quickStartUrl})`}
  ${guideUrl && `- [Developer Guide](${guideUrl})`}
  ${apiReferenceUrl && `- [API Reference](${apiReferenceUrl})`}
  ${dependencyDiagramUrl && `- [Dependency Diagram](${dependencyDiagramUrl})`}
  ${codeCoverageUrl && `- [Code coverage report](${codeCoverageUrl})`}

  ## Resources
  - DXOS [Website](https://dxos.org)
  - DXOS [Blog](https://blog.dxos.org)
  - DXOS [Roadmap](https://dxos.org/roadmap)
  - DXOS [Events calendar](https://dxos.org/events)
  - Hang out with the community on [Discord](https://dxos.org/discord)
  - Tag [questions on Stack Overflow](https://stackoverflow.com/questions/tagged/dxos) with \`#dxos\`
  - Tag us on twitter [\`@dxos\`](https://twitter.com/dxos)

  ## Contributions
  Your ideas, issues, and code are most welcome. Please take a look at our [community code of conduct](), the [issue guide](), and the [PR contribution guide](). If you would like to contribute to the design and implementation of DXOS, please [start here]().

  [License: MIT](LICENSE.md) Copyright 2022 © DXOS
  `;
};

export default template;