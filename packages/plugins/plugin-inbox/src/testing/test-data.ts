//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { create, EchoObject, ObjectId } from '@dxos/echo-schema';
import { Contact, MessageType } from '@dxos/schema';

const createContact = (name: string, email: string): Contact => {
  return create(Contact, {
    name,
    identifiers: [{ type: 'email', value: email }],
  });
};

/**
 * Helper to create dates in reverse chronological order
 */
const getDate = (daysAgo: number) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
};

export const DocumentType = Schema.Struct({
  id: ObjectId,
  name: Schema.String,
  content: Schema.String,
}).pipe(EchoObject({ typename: 'dxos.org/example/Document', version: '0.1.0' }));
export type DocumentType = typeof DocumentType.Type;

const createDocument = (name: string, content: string): DocumentType => {
  return create(DocumentType, {
    name,
    content,
  });
};

export type Label = {
  name: string;
  color: string;
  description: string;
};

export const labels: Label[] = [
  { name: 'Fundraising', color: '#000000', description: 'Fundraising campaigns and investor relations' },
  { name: 'Important', color: '#FF0000', description: 'High priority items' },
  { name: 'Personal', color: '#4B0082', description: 'Personal communications' },
  { name: 'Work', color: '#0000FF', description: 'Work-related items' },
  { name: 'Finance', color: '#008000', description: 'Financial matters' },
  { name: 'Archived', color: '#808080', description: 'Completed items' },
  { name: 'Spam', color: '#FF0000', description: 'Spam messages' },
];

export const contacts: Record<string, Contact> = {
  john: createContact('John Doe', 'john.doe@example.com'),
  sarah: createContact('Sarah Johnson', 'sarah.johnson@techvision.com'),
  michael: createContact('Michael Chen', 'michael.chen@techvision.com'),
  emma: createContact('Emma Rodriguez', 'e.rodriguez@investors.com'),
  david: createContact('David Williams', 'david@accountingfirm.com'),
  unknown1: createContact('Bitcoin Support', 'support@btc-wallet-verify.com'),
  unknown2: createContact('HR Department', 'hr-department@techvison-company.co'),
};

export const emails: MessageType[] = [
  // Recent emails.
  create(MessageType, {
    blocks: [
      {
        type: 'text',
        text: "Hi Alex, I've reviewed the Q3 financial reports and would like to schedule a meeting to discuss some concerns about the marketing budget allocation. Are you available tomorrow afternoon?",
      },
    ],
    sender: contacts.david,
    created: getDate(0),
    properties: { subject: 'Q3 Financial Review' },
  }),

  create(MessageType, {
    blocks: [
      {
        type: 'text',
        text: "Alex, the board is impressed with the latest product metrics. We'd like to discuss expansion plans in our next meeting. Please prepare a presentation on potential market opportunities in Asia.",
      },
    ],
    sender: contacts.emma,
    created: getDate(1),
    properties: { subject: 'Board Feedback and Next Steps' },
  }),

  create(MessageType, {
    blocks: [
      {
        type: 'text',
        text: "The engineering team has completed the beta version of our new feature. We're ready for internal testing before the public release next month. I've attached the testing protocol document for your review.",
      },
    ],
    sender: contacts.michael,
    created: getDate(1),
    properties: { subject: 'New Feature Ready for Testing' },
  }),

  create(MessageType, {
    blocks: [
      {
        type: 'text',
        text: '🚨 URGENT: Your Bitcoin wallet requires immediate verification to prevent account suspension. Click here to verify your credentials and receive a bonus 0.5 BTC for your cooperation.',
      },
    ],
    sender: contacts.unknown1,
    created: getDate(2),
    properties: { subject: 'URGENT: Bitcoin Wallet Verification Required' },
  }),

  create(MessageType, {
    blocks: [
      {
        type: 'text',
        text: "Following up on our conversation at the industry conference last week. I believe there's potential for a strategic partnership between our companies. Would you be interested in scheduling a call to discuss collaboration opportunities?",
      },
    ],
    sender: contacts.john,
    created: getDate(3),
    properties: { subject: 'Potential Strategic Partnership' },
  }),

  create(MessageType, {
    blocks: [
      {
        type: 'text',
        text: "The HR department has processed the new hire paperwork for the three senior developers. They're scheduled to start next Monday. I'll need your final approval on their equipment budget by EOD tomorrow.",
      },
    ],
    sender: contacts.sarah,
    created: getDate(4),
    properties: { subject: 'New Hires Starting Next Week' },
  }),

  create(MessageType, {
    blocks: [
      {
        type: 'text',
        text: "Our team has identified a critical security vulnerability in our payment processing system. We've implemented a temporary fix, but we need to discuss a more permanent solution and potential disclosure to affected customers.",
      },
    ],
    sender: contacts.michael,
    created: getDate(5),
    properties: { subject: 'Security Incident Report' },
  }),

  create(MessageType, {
    blocks: [
      {
        type: 'text',
        text: "I've reviewed the proposed acquisition target and have some concerns about their IP portfolio. Before we proceed further, I recommend a more thorough due diligence process. Let's discuss this in our next meeting.",
      },
    ],
    sender: contacts.emma,
    created: getDate(6),
    properties: { subject: 'Acquisition Target Concerns' },
  }),

  create(MessageType, {
    blocks: [
      {
        type: 'text',
        text: 'The quarterly tax filings are due next week. I need your signature on several documents before Thursday. Can we schedule a brief meeting tomorrow to go through them?',
      },
    ],
    sender: contacts.david,
    created: getDate(7),
    properties: { subject: 'Quarterly Tax Filings' },
  }),

  create(MessageType, {
    blocks: [
      {
        type: 'text',
        text: "We've received an offer to speak at the International Tech Summit in Singapore next month. This would be an excellent opportunity to announce our expansion plans. Please let me know if you're interested in attending.",
      },
    ],
    sender: contacts.sarah,
    created: getDate(8),
    properties: { subject: 'Speaking Opportunity: International Tech Summit' },
  }),

  create(MessageType, {
    blocks: [
      {
        type: 'text',
        text: 'ATTENTION: Company-wide policy update requires immediate action. Please download and install the attached software to update your security credentials. This is mandatory for all executives.',
      },
    ],
    sender: contacts.unknown2,
    created: getDate(9),
    properties: { subject: 'MANDATORY: Security Update Required' },
  }),

  create(MessageType, {
    blocks: [
      {
        type: 'text',
        text: "The customer satisfaction survey results for Q2 are now available. Overall sentiment has improved by 15% since our UI redesign. I've prepared a detailed report for the executive meeting next week.",
      },
    ],
    sender: contacts.michael,
    created: getDate(10),
    properties: { subject: 'Q2 Customer Satisfaction Results' },
  }),

  create(MessageType, {
    blocks: [
      {
        type: 'text',
        text: "I've scheduled the annual company retreat for the first weekend of October. Please confirm your attendance and any dietary restrictions. We'll be discussing the strategic roadmap for the next fiscal year.",
      },
    ],
    sender: contacts.sarah,
    created: getDate(12),
    properties: { subject: 'Annual Company Retreat Planning' },
  }),

  create(MessageType, {
    blocks: [
      {
        type: 'text',
        text: "Our main competitor just announced a significant price reduction for their enterprise plan. We need to discuss our response strategy. I've prepared some initial thoughts for your consideration.",
      },
    ],
    sender: contacts.john,
    created: getDate(14),
    properties: { subject: 'Competitor Price Change - Strategic Response Needed' },
  }),

  create(MessageType, {
    blocks: [
      {
        type: 'text',
        text: "The legal team has completed the review of the new privacy policy. We're ready to implement the changes ahead of the regulatory deadline. Please review the final draft attached to this email.",
      },
    ],
    sender: contacts.david,
    created: getDate(15),
    properties: { subject: 'Privacy Policy Update - Final Review' },
  }),

  create(MessageType, {
    blocks: [
      {
        type: 'text',
        text: "I'm pleased to inform you that our Series C funding round is oversubscribed. We have multiple VCs competing for allocation. Let's schedule a call to discuss the final investor selection and terms.",
      },
    ],
    sender: contacts.emma,
    created: getDate(16),
    properties: { subject: 'Series C Funding Update - Oversubscribed' },
  }),

  create(MessageType, {
    blocks: [
      {
        type: 'text',
        text: "The product team has finalized the roadmap for the next 18 months. I'd like to present it to you before sharing it with the broader organization. Are you available for a review session this week?",
      },
    ],
    sender: contacts.michael,
    created: getDate(18),
    properties: { subject: 'Product Roadmap Finalized' },
  }),

  create(MessageType, {
    blocks: [
      {
        type: 'text',
        text: "We've received an acquisition offer from TechGiant Corp. The initial offer is $450M. I've scheduled an emergency board meeting for tomorrow at 3 PM to discuss this unexpected development.",
      },
    ],
    sender: contacts.emma,
    created: getDate(20),
    properties: { subject: 'CONFIDENTIAL: Acquisition Offer Received' },
  }),

  create(MessageType, {
    blocks: [
      {
        type: 'text',
        text: 'The annual audit is scheduled to begin next month. Please ensure all departments have their documentation prepared according to the checklist I sent last week. Let me know if you have any questions.',
      },
    ],
    sender: contacts.david,
    created: getDate(22),
    properties: { subject: 'Annual Audit Preparation' },
  }),

  create(MessageType, {
    blocks: [
      {
        type: 'text',
        text: "Hello, nice to meet you! I'm looking forward to our partnership discussion next week. I've prepared some initial thoughts on how our companies can collaborate effectively.",
      },
    ],
    sender: contacts.john,
    created: getDate(25),
    properties: { subject: 'Introduction and Partnership Discussion' },
  }),
];

export const documents = [
  createDocument(
    'Q3 Financial Report',
    'Q3 Financial Summary\n\nRevenue: $12.4M (↑8% YoY)\nExpenses: $8.7M (↑15% YoY)\nMargin: 29.8% (↓4.5% YoY)\n\nConcerns:\n- Marketing budget exceeded allocation by 23%\n- Customer acquisition cost increased to $142 (↑18%)\n- New product line underperforming projections by 35%\n\nRecommendations:\n1. Reallocate Q4 marketing budget to high-performing channels\n2. Implement cost-saving measures in non-essential operations\n3. Review pricing strategy for new product line',
  ),
  createDocument(
    'Testing Protocol',
    'Beta Testing Protocol v2.3\n\nPhase 1: Internal QA (2 weeks)\n- Unit testing coverage must exceed 85%\n- Integration testing across all supported platforms\n- Performance benchmarking against v4.2\n\nPhase 2: Closed Beta (3 weeks)\n- 250 selected customers from premium tier\n- Daily feedback collection and triage\n- Weekly build updates based on critical issues\n\nPhase 3: Open Beta (2 weeks)\n- Gradual rollout to 10,000 users\n- A/B testing of UI variations\n- Stress testing with simulated peak loads\n\nSuccess Criteria:\n- Crash rate below 0.1%\n- User satisfaction score >4.2/5\n- Performance degradation <5% on target devices',
  ),
  createDocument(
    'Asia Market Expansion',
    'Asia Market Expansion Strategy\n\nTarget Markets:\n1. Japan - $4.2B TAM, 22% CAGR\n2. South Korea - $2.8B TAM, 19% CAGR\n3. Singapore - $1.5B TAM, 24% CAGR\n\nCompetitive Landscape:\n- Local players dominate 65% of market share\n- Western competitors struggling with localization\n- Regulatory environment favors local partnerships\n\nEntry Strategy:\n- Phase 1: Strategic partnerships with established distributors\n- Phase 2: Local office establishment in Singapore (regional hub)\n- Phase 3: Acquisition of complementary local technology firms\n\nProjected ROI: 3.2x investment over 5 years with break-even in Year 3',
  ),
  createDocument(
    'Strategic Partnership Proposal',
    'Partnership Framework: TechVision & Example Corp\n\nProposed Collaboration Areas:\n\n1. Technology Integration\n   - API access to respective platforms\n   - Joint development of middleware solutions\n   - Shared data insights with privacy controls\n\n2. Market Expansion\n   - Co-branded offerings for enterprise segment\n   - Channel partner access in respective regions\n   - Joint participation in industry events\n\n3. Investment Structure\n   - Initial pilot project ($250K shared investment)\n   - Success-based scaling model\n   - Equity considerations for Phase 2\n\nAnticipated Outcomes:\n- $8-12M incremental revenue within 24 months\n- 15% reduction in customer acquisition costs\n- Accelerated product roadmap by ~6 months',
  ),
  createDocument(
    'Annual Audit Checklist',
    'FY2023 Audit Preparation Checklist\n\nFinance Department:\n- General ledger and trial balance\n- Bank reconciliations and statements (all accounts)\n- Accounts receivable aging report with bad debt analysis\n- Fixed asset register with depreciation schedules\n- Loan agreements and covenant compliance documentation\n\nOperations:\n- Inventory count procedures and results\n- Major contracts and purchase agreements\n- Vendor master list with annual spend analysis\n- Warehouse security and valuation procedures\n\nHR:\n- Payroll reconciliations and tax filings\n- Benefits administration documentation\n- Employee handbook and policy updates\n- Executive compensation agreements\n\nIT:\n- System access controls documentation\n- Backup and disaster recovery testing results\n- Security incident reports and resolution documentation\n- Software license compliance report',
  ),
  createDocument(
    'Product Roadmap 2023-2024',
    'Product Roadmap: July 2023 - December 2024\n\nQ3 2023:\n- Core platform v5.0 release\n  • Redesigned user interface\n  • Performance improvements (50% faster loading)\n  • Enhanced security features\n\nQ4 2023:\n- Mobile application redesign\n- Enterprise SSO integration\n- Custom reporting engine\n\nQ1 2024:\n- AI-powered recommendation system\n- Advanced analytics dashboard\n- API v3 with expanded capabilities\n\nQ2 2024:\n- Multi-tenant architecture\n- Compliance module for regulated industries\n- White-labeling capabilities\n\nQ3-Q4 2024:\n- International expansion features\n- Blockchain integration for document verification\n- Industry-specific vertical solutions\n\nResource Allocation:\n- Engineering: 65% of budget\n- Design: 15% of budget\n- QA: 12% of budget\n- Documentation/Support: 8% of budget',
  ),
  createDocument(
    'TechGiant Acquisition Offer',
    'CONFIDENTIAL: TechGiant Acquisition Offer Analysis\n\nOffer Details:\n- $450M all-cash transaction\n- 30-day exclusivity period requested\n- Retention packages for key executives (3-year vesting)\n- Product integration roadmap provided\n\nValuation Analysis:\n- 8.2x trailing twelve-month revenue\n- 6.4x forward revenue (based on projections)\n- 22x EBITDA (industry average: 18-24x)\n\nComparable Transactions:\n- CompetitorX acquisition: 7.5x revenue (2022)\n- StartupY acquisition: 9.1x revenue (2023)\n\nPreliminary Board Considerations:\n- Offer represents 35% premium to last funding round valuation\n- Potential regulatory concerns in EU market\n- IP ownership transition requires careful structuring\n- Alternative paths to liquidity should be evaluated\n\nNext Steps:\n- Engage outside counsel for preliminary review\n- Prepare counter-proposal scenarios\n- Develop communication strategy for employees and customers',
  ),
  // Unrelated documents
  createDocument(
    'Employee Handbook',
    'TechVision Employee Handbook v3.2\n\nSection 1: Company Overview\n- Mission and values\n- Organizational structure\n- Company history\n\nSection 2: Employment Policies\n- Equal opportunity statement\n- At-will employment explanation\n- Code of conduct\n- Confidentiality requirements\n\nSection 3: Compensation & Benefits\n- Pay periods and methods\n- Health insurance options\n- 401(k) plan details\n- Stock option program\n- Professional development allowance\n\nSection 4: Time Off & Leave Policies\n- Vacation accrual schedule\n- Sick leave policy\n- Parental leave benefits\n- Bereavement and jury duty\n\nSection 5: Workplace Guidelines\n- Office hours and flexible work\n- Remote work policies\n- Equipment usage\n- Expense reimbursement procedure\n\nSection 6: Health & Safety\n- Emergency procedures\n- Workplace safety guidelines\n- Incident reporting process',
  ),
  createDocument(
    'Project Moonshot',
    'Project Moonshot: Preliminary Research\n\nMarket Opportunity:\n- $35B global addressable market by 2026\n- 42% CAGR in emerging economies\n- Limited competition with established solutions\n\nTechnical Feasibility:\n- Core technology proven in lab environment (TRL 4)\n- Key patents identified for licensing or acquisition\n- Estimated 18-24 months to minimum viable product\n\nResource Requirements:\n- Core team of 8-10 engineers (3 specialized roles)\n- Initial funding need: $4.2M for Phase 1\n- Strategic partnerships required for manufacturing\n\nRisk Assessment:\n- Regulatory approval pathway unclear in target markets\n- Two competing technologies in early development\n- Supply chain dependencies for critical components\n\nNext Decision Point:\n- Go/no-go for prototype development by Q4',
  ),
  createDocument(
    'Office Relocation Plan',
    'Headquarters Relocation Plan: Downtown Campus\n\nTimeline:\n- Phase 1: Planning & Design (3 months)\n- Phase 2: Construction & Buildout (5 months)\n- Phase 3: Move Execution (1 month)\n- Target completion: December 15\n\nSpace Details:\n- 45,000 sq ft across 3 floors\n- 320 workstations (30% hot-desking)\n- 18 conference rooms of varying sizes\n- 5 specialized collaboration spaces\n- Expanded lab and testing facilities\n\nBudget Summary:\n- Lease: $42/sq ft annually ($1.89M/year)\n- Buildout: $185/sq ft ($8.3M total)\n- Furniture & Equipment: $2.4M\n- Moving & Logistics: $350K\n- Technology Infrastructure: $1.2M\n\nDepartment Migration Schedule:\n- Engineering: December 3-4\n- Product & Design: December 5-6\n- Sales & Marketing: December 10-11\n- Executive & Operations: December 12-13',
  ),
];
