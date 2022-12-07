import { defineTemplate, text } from '@dxos/plate';

export default defineTemplate(({ input }) => {
  return text`
    # readme
    \`\`\`
    ${JSON.stringify(input, null, 2)}
    \`\`\`
  `;
});
