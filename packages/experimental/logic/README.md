# Logic

To run the script:

```bash
moon run logic:run
```

## Process

- implement the spec below
- update notes to keep track of activity

## Spec

- update the script to download and parse the wikipedia page: https://en.wikipedia.org/wiki/List_of_fallacies
- the script should create a JSON file logic.json that contains the list of logical fallacies
- each item should contain the following fields:
  - name
  - description
  - tags (array of strings)
    - should be one or more categories (compile a list) like: "formal", "informal", "relevance", "improper-premise"
  - urls (array of urls)
    - should contain a link to any canonically linked wiki page

## Notes

### Completed - December 2025

- Implemented script to download and parse Wikipedia's "List of fallacies" page
- Successfully extracts 174 logical fallacies from the page
- Each fallacy includes:
  - name: The name of the fallacy
  - description: A brief explanation of what the fallacy is
  - tags: Categories extracted from section headings (15 unique tags)
    - Tag processing: removes "fallacy"/"fallacies" from tags, splits compound tags (e.g., "formal-syllogistic-fallacies" → ["formal", "syllogistic"])
  - urls: Link to the Wikipedia page for that fallacy
- Output is written to `logic.json` in the package directory
- Run the script with: `moon run logic:run`

### Implementation Details

- Uses `jsdom` to parse the HTML from Wikipedia
- Extracts fallacies from list items (`<li>`) containing links
- Automatically categorizes fallacies based on section headings using TreeWalker
- Processes tags to create filterable single-word categories
- Cleans up text by removing reference markers and extra whitespace
- Filters out navigation/utility links and metadata

### Tag Categories

15 unique tags across 174 fallacies:

- **informal** (155) - Informal fallacies
- **relevance** (81) - Relevance-based fallacies
- **red**, **herring** (74 each) - Red herring fallacies
- **formal** (19) - Formal fallacies
- **cause**, **questionable** (13 each) - Questionable cause fallacies
- **faulty**, **generalizations** (12 each) - Faulty generalization fallacies
- **syllogistic** (9) - Syllogistic fallacies
- **statistical** (7) - Statistical fallacies
- **improper**, **premise** (4 each) - Improper premise fallacies
- **propositional** (3) - Propositional fallacies
- **quantification** (1) - Quantification fallacies
