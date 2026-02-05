//
// Copyright 2025 DXOS.org
//

declare module 'command-score' {
  /**
   * Scores how well a string matches a query using a fuzzy matching algorithm.
   * Used by cmdk for its built-in filtering.
   *
   * @param string - The string to score against.
   * @param query - The search query.
   * @returns A score between 0 and 1, where higher values indicate better matches.
   */
  function commandScore(string: string, query: string): number;
  export default commandScore;
}
