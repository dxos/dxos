/**
 * This utility helps escape RegEx symbols from a string to allow it to be used as a pure pattern without setting off
 * any dots, dashes and other RegExp directives
 * @param str the regex string to escape (which may contain regex characters)
 * @returns a string passable to a RegExp constructor
 */
export const escapeRegExp = (str: string) => String(str).replace(/([.*+?=^!:${}()|[\]\/\\])/g, '\\$1');
