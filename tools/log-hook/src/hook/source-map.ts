import { loadSync } from 'sorcery';

/**
 * Combines two source maps for the same file and outputs a new source map.
 *
 * @param prevMap Source map from the first compilation step.
 * @param newMap Source map from the second compilation step.
 */
 export const combineSourceMaps = (prevMap: string, nextMap: string) => {
  const prev = JSON.parse(prevMap);
  const newMap = JSON.parse(nextMap);
  try {

    newMap.sources[0] = '/prev';
    const generated = loadSync('/new', {
      content: {
        '/new': newMap.sourcesContent[0],
        '/prev': prev.sourcesContent[0]
      },
      sourcemaps: {
        '/new': newMap,
        '/prev': prev
      }
    }).apply();

    generated.sources[0] = '/' + generated.sources[0];

    return JSON.stringify(generated);
  } catch (err) {
    console.error(err);
    console.log({
      prev,
      newMap
    });
    throw err;
  }
};