import { TemplateFunction } from '../../executeFileTemplate';
import { Input } from './config.t';

const template: TemplateFunction<Input> = ({ input }) => `
# Package 
${JSON.stringify(input, null, 2)}
`;

export default template;
