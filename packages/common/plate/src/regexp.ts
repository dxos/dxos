export const escapeRegExp = (str: string) => String(str).replace(/([.*+?=^!:${}()|[\]\/\\])/g, '\\$1');
