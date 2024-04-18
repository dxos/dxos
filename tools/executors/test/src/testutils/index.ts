// Keep as literal so vitest can substitute this.
const ENV_TAGS = process.env.MOCHA_TAGS;
const ENV_ENV = process.env.VITEST_ENV;

const tags = (ENV_TAGS ?? '').split(',');

export const tagEnabled = (tag: string) => tags.includes(tag);

export const inEnvironment = (...environments: string[]) => environments.includes(ENV_ENV ?? 'nodejs');
