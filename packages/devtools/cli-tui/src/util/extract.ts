//
// Copyright 2025 DXOS.org
//

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { JSDOM } from 'jsdom';
import fetch from 'node-fetch';

// TODO(burdon): Test util to extract structured data from wikipedia.

type Fallacy = {
  name: string;
  description: string;
  tags: string[];
  urls: string[];
};

const WIKIPEDIA_URL = 'https://en.wikipedia.org/wiki/List_of_fallacies';
const FILENAME = 'fallacies.json';

const cleanText = (text: string): string => {
  return text.replace(/\[.*?\]/g, '').trim();
};

const processTags = (rawTags: string[]): string[] => {
  const tagSet = new Set<string>();

  rawTags.forEach((tag) => {
    // Remove "fallacy" and "fallacies" from tags.
    const cleaned = tag.replace(/-?fallacies?/g, '').replace(/^-+|-+$/g, '');

    // Split compound tags by hyphens into separate tags.
    const parts = cleaned.split('-').filter((part) => part.length > 0);

    parts.forEach((part) => {
      if (part.length > 1) {
        // Avoid single-letter tags.
        tagSet.add(part);
      }
    });
  });

  return Array.from(tagSet).sort();
};

const extractFallacies = async (): Promise<Fallacy[]> => {
  console.log(`Fetching ${WIKIPEDIA_URL}...`);
  const response = await fetch(WIKIPEDIA_URL);
  const html = await response.text();

  const dom = new JSDOM(html);
  const document = dom.window.document;

  const fallacies: Fallacy[] = [];
  const contentDiv = document.querySelector('#mw-content-text');

  if (!contentDiv) {
    console.error('Could not find content div');
    return fallacies;
  }

  // Build a map of all elements to their section categories.
  const elementToCategories = new Map<Element, string[]>();

  // Walk through all elements and track the category hierarchy.
  const walker = document.createTreeWalker(contentDiv, 1); // 1 = NodeFilter.SHOW_ELEMENT
  const categoryStack: Array<{ level: number; name: string }> = [];

  let node = walker.nextNode();
  while (node) {
    const element = node as Element;

    if (element.tagName.match(/^H[2-4]$/)) {
      const headingText = cleanText(element.textContent || '');
      if (
        headingText &&
        !headingText.includes('See also') &&
        !headingText.includes('References') &&
        !headingText.includes('External links') &&
        !headingText.includes('Notes') &&
        !headingText.includes('Further reading') &&
        !headingText.includes('Citations') &&
        !headingText.includes('Sources')
      ) {
        const level = parseInt(element.tagName[1]);
        const category = headingText
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');

        // Pop categories at same or deeper level.
        while (categoryStack.length > 0 && categoryStack[categoryStack.length - 1].level >= level) {
          categoryStack.pop();
        }

        categoryStack.push({ level, name: category });
      }
    } else if (element.tagName === 'LI') {
      // Store current category path for this list item.
      elementToCategories.set(
        element,
        categoryStack.map((c) => c.name),
      );
    }

    node = walker.nextNode();
  }

  // Find all list items in the content.
  const listItems = contentDiv.querySelectorAll('ul > li');
  listItems.forEach((li) => {
    // Find the first link in the list item.
    const link = li.querySelector('a');
    if (!link) return;

    // Skip navigation/utility links.
    const href = link.getAttribute('href') || '';
    if (
      !href.startsWith('/wiki/') ||
      href.includes('Special:') ||
      href.includes('Help:') ||
      href.includes('Wikipedia:')
    ) {
      return;
    }

    const name = cleanText(link.textContent || '');
    if (!name || name.length < 3) return;

    // Skip if this looks like metadata (citations, etc).
    if (/^\d+$/.test(name)) return;

    const url = `https://en.wikipedia.org${href}`;

    // Get description - the text after the link in the list item.
    const fullText = cleanText(li.textContent || '');
    let description = fullText.substring(name.length).trim();

    // Remove leading dash/hyphen.
    description = description.replace(/^[–—-]\s*/, '');

    // Clean up common patterns.
    description = description.replace(/\(.*?\)$/g, '').trim();

    // Get tags from the category map and process them.
    const rawTags: string[] = elementToCategories.get(li) || [];
    const tags = processTags(rawTags);

    // Only add if we have a reasonable description or it's a known fallacy.
    if (description.length > 10 || name.toLowerCase().includes('fallacy')) {
      fallacies.push({
        name,
        description,
        tags,
        urls: [url],
      });
    }
  });

  return fallacies;
};

const main = async () => {
  try {
    const fallacies = await extractFallacies();
    console.log(`Extracted ${fallacies.length} fallacies`);

    const outDir = join(process.cwd(), 'out');
    mkdirSync(outDir, { recursive: true });
    const outputPath = join(outDir, FILENAME);
    writeFileSync(outputPath, JSON.stringify(fallacies, null, 2));

    console.log(`Written to ${outputPath}`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

void main();
