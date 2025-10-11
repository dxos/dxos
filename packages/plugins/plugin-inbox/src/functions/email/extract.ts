//
// Copyright 2025 DXOS.org
//

export type Contact = {
  email: string;
  body: string;
};

export type SignatureData = {
  contacts: Contact[];
};

export type ParsedSignature = {
  name?: string;
  company?: string;
};

// TODO(burdon): Scrapers (e.g., ScrapeGraphAI).

/**
 * Parses an email signature body to extract name and company information.
 */
export const parseSignature = (body: string): ParsedSignature => {
  const lines = body
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  let name: string | undefined;
  let company: string | undefined;

  // Common patterns for extracting information.
  const emailPattern = /^[\w.-]+@[\w.-]+\.[a-z]+$/i;
  const phonePattern = /^[\d\s().-]+$/;
  const urlPattern = /^(https?:\/\/)?([\w.-]+\.[a-z]+)(\/.*)?$/i;
  const titleKeywords = ['manager', 'director', 'founder', 'partner', 'ceo', 'cto', 'cfo'];
  const companyKeywords = [
    'LLC',
    'Inc',
    'Corp',
    'Corporation',
    'Ltd',
    'Limited',
    'Capital',
    'Consulting',
    'Partners',
    'Company',
    'Co\\.',
  ];

  // Helper functions
  const isEmail = (line: string) => emailPattern.test(line) || line.includes('@');
  const isPhone = (line: string) => {
    const digits = line.match(/\d/g);
    return phonePattern.test(line.replace(/[^\d\s().-]/g, '')) && (digits?.length ?? 0) >= 7;
  };
  const isUrl = (line: string) => urlPattern.test(line) || line.includes('.com') || line.includes('.xyz');
  const isTitle = (line: string) => titleKeywords.some((keyword) => line.toLowerCase().includes(keyword));
  const isCompanyName = (line: string) => {
    // Check if line contains company keywords.
    const hasCompanyKeyword = companyKeywords.some((keyword) => new RegExp(`\\b${keyword}\\b`, 'i').test(line));
    // Or if it's all caps (common for company names).
    const isAllCaps = line === line.toUpperCase() && line.length > 3 && /[A-Z]/.test(line);
    return hasCompanyKeyword || isAllCaps;
  };
  const looksLikeName = (line: string) => {
    // Names typically start with capital letter, have 2-4 words, and don't contain company keywords.
    return (
      /^[A-Z][a-z]/.test(line) && line.split(/\s+/).length >= 2 && line.split(/\s+/).length <= 4 && !isCompanyName(line)
    );
  };

  // First, classify all lines.
  const lineTypes = lines.map((line) => ({
    line,
    isEmail: isEmail(line),
    isPhone: isPhone(line),
    isUrl: isUrl(line),
    isTitle: isTitle(line),
    isCompany: isCompanyName(line),
    looksLikeName: looksLikeName(line),
    isThanks: line.toLowerCase() === 'thanks' || line.toLowerCase() === 'thanks,',
    isPronoun:
      line.includes('(') && line.includes(')') && (line.includes('/') || line.includes('him') || line.includes('her')),
  }));

  // Find the name.
  for (let i = 0; i < lineTypes.length; i++) {
    const current = lineTypes[i];
    const next = lineTypes[i + 1];

    // Skip non-name lines.
    if (current.isEmail || current.isPhone || current.isUrl || current.isThanks) {
      continue;
    }

    // If line has pronouns, it's definitely a name.
    if (current.isPronoun) {
      name = current.line.replace(/\s*\([^)]*\)\s*/, '').trim();
      break;
    }

    // If it looks like a name and isn't a company, it's probably a name.
    if (current.looksLikeName && !current.isCompany) {
      name = current.line;
      break;
    }

    // If next line is a title and current looks like name, it's a name.
    if (next && next.isTitle && current.looksLikeName) {
      name = current.line;
      break;
    }
  }

  // Find the company.
  for (let i = 0; i < lineTypes.length; i++) {
    const current = lineTypes[i];

    // Skip if it's the name we found or contact info.
    if (current.line === name || current.isEmail || current.isPhone || current.isUrl || current.isThanks) {
      continue;
    }

    // If it's identified as a company, use it.
    if (current.isCompany) {
      company = current.line;
      break;
    }
  }

  return { name, company };
};
