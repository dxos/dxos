//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { create, EchoObject, ObjectId } from '@dxos/echo-schema';
import { ContactType, MessageType } from '@dxos/schema';

const createContact = (name: string, email: string): ContactType => {
  return create(ContactType, {
    name,
    identifiers: [{ type: 'email', value: email }],
  });
};

/**
 * Helper to create dates in reverse chronological order
 */
const getDate = (daysAgo: number): string => {
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

export const contacts = {
  john: createContact('John Doe', 'john.doe@example.com'),
  sarah: createContact('Sarah Johnson', 'sarah.johnson@techvision.com'),
  michael: createContact('Michael Chen', 'michael.chen@techvision.com'),
  emma: createContact('Emma Rodriguez', 'e.rodriguez@investors.com'),
  david: createContact('David Williams', 'david@accountingfirm.com'),
  unknown1: createContact('Bitcoin Support', 'support@btc-wallet-verify.com'),
  unknown2: createContact('HR Department', 'hr-department@techvison-company.co'),
};

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

export const transcriptMessages: MessageType[] = [
  create(MessageType, {
    sender: {
      name: contacts.john.name,
    },
    created: getDate(0),
    blocks: [
      {
        type: 'transcription',
        started: getDate(0),
        text: 'Good morning everyone. Thanks for joining the quarterly strategy meeting. I see Sarah and Emma are here. Are we still waiting for David?',
      },
      {
        type: 'transcription',
        started: getDate(30),
        text: 'While we wait, let me pull up the Q3 Financial Report that we need to review today.',
      },
    ],
  }),
  create(MessageType, {
    sender: {
      name: contacts.sarah.name,
    },
    created: getDate(45),
    blocks: [
      {
        type: 'transcription',
        started: getDate(45),
        text: "Morning John. David texted me that he's running about 5 minutes late. Something about finalizing some numbers for us.",
      },
    ],
  }),
  create(MessageType, {
    sender: {
      name: contacts.emma.name,
    },
    created: getDate(60),
    blocks: [
      {
        type: 'transcription',
        started: getDate(60),
        text: "Hi everyone. I've already reviewed the Q3 report. I'm particularly concerned about the marketing budget overrun. 23% over allocation is significant.",
      },
    ],
  }),
  create(MessageType, {
    sender: {
      name: contacts.john.name,
    },
    created: getDate(90),
    blocks: [
      {
        type: 'transcription',
        started: getDate(90),
        text: "I agree, Emma. That's definitely one of our top concerns. We also need to address the underperforming new product line. It's 35% below projections.",
      },
    ],
  }),
  create(MessageType, {
    sender: {
      name: contacts.david.name,
    },
    created: getDate(120),
    blocks: [
      {
        type: 'transcription',
        started: getDate(120),
        text: "Sorry I'm late everyone. I was just finalizing the numbers for our Asia Market Expansion strategy to discuss today.",
      },
      {
        type: 'transcription',
        started: getDate(135),
        text: "I see you're already discussing the Q3 report. The margin decrease is concerning, but I think it's related to our investment in the new markets.",
      },
    ],
  }),
  create(MessageType, {
    sender: {
      name: contacts.sarah.name,
    },
    created: getDate(160),
    blocks: [
      {
        type: 'transcription',
        started: getDate(160),
        text: "David, regarding the Asia expansion, I've been working with Michael from the Singapore office. The regulatory environment there definitely favors local partnerships as mentioned in our strategy document.",
      },
    ],
  }),
  create(MessageType, {
    sender: {
      name: contacts.emma.name,
    },
    created: getDate(190),
    blocks: [
      {
        type: 'transcription',
        started: getDate(190),
        text: 'I think we should also consider the TechGiant acquisition offer in light of our expansion plans. The $450M all-cash transaction would give us significant resources for the Asia push.',
      },
      {
        type: 'transcription',
        started: getDate(210),
        text: 'Has anyone spoken with Alex about this? As our CFO, his input would be valuable.',
      },
    ],
  }),
  create(MessageType, {
    sender: {
      name: contacts.john.name,
    },
    created: getDate(240),
    blocks: [
      {
        type: 'transcription',
        started: getDate(240),
        text: "I had lunch with Alex yesterday. He's running the numbers, but his initial reaction was positive. The 35% premium over our last funding round is attractive.",
      },
      {
        type: 'transcription',
        started: getDate(260),
        text: "Let's shift gears to the Product Roadmap for 2023-2024. Sarah, can you give us an update on the Q3 deliverables?",
      },
    ],
  }),
  create(MessageType, {
    sender: {
      name: contacts.sarah.name,
    },
    created: getDate(290),
    blocks: [
      {
        type: 'transcription',
        started: getDate(290),
        text: 'Sure. The core platform v5.0 is on track for release next month. The redesigned UI has tested well with focus groups, and performance improvements are exceeding our 50% faster loading target.',
      },
      {
        type: 'transcription',
        started: getDate(320),
        text: "I've been working closely with Jennifer's team on the enhanced security features. They've done an excellent job.",
      },
    ],
  }),
  create(MessageType, {
    sender: {
      name: contacts.david.name,
    },
    created: getDate(350),
    blocks: [
      {
        type: 'transcription',
        started: getDate(350),
        text: 'Speaking of security, I received an email from someone claiming to be from Bitcoin Support. It looked suspicious, so I forwarded it to our IT security team.',
      },
    ],
  }),
  create(MessageType, {
    sender: {
      name: contacts.john.name,
    },
    created: getDate(380),
    blocks: [
      {
        type: 'transcription',
        started: getDate(380),
        text: "Good call, David. There's been an increase in phishing attempts lately. Everyone should remain vigilant.",
      },
      {
        type: 'transcription',
        started: getDate(400),
        text: 'Now, regarding our Strategic Partnership Proposal with Example Corp, I had a productive call with their CEO yesterday.',
      },
    ],
  }),
  create(MessageType, {
    sender: {
      name: contacts.emma.name,
    },
    created: getDate(430),
    blocks: [
      {
        type: 'transcription',
        started: getDate(430),
        text: "That's great to hear. The partnership framework looks solid. I particularly like the co-branded offerings for the enterprise segment. That aligns well with our Q4 goals.",
      },
    ],
  }),
  create(MessageType, {
    sender: {
      name: contacts.sarah.name,
    },
    created: getDate(460),
    blocks: [
      {
        type: 'transcription',
        started: getDate(460),
        text: 'By the way, has everyone completed their items for the Annual Audit Checklist? The HR Department sent a reminder yesterday about the payroll reconciliations and tax filings.',
      },
    ],
  }),
  create(MessageType, {
    sender: {
      name: contacts.david.name,
    },
    created: getDate(490),
    blocks: [
      {
        type: 'transcription',
        started: getDate(490),
        text: "I've submitted all the finance department items. The general ledger, trial balance, and bank reconciliations are all ready for review.",
      },
      {
        type: 'transcription',
        started: getDate(510),
        text: "I'm still working on the accounts receivable aging report with bad debt analysis. Should have that done by tomorrow.",
      },
    ],
  }),
  create(MessageType, {
    sender: {
      name: contacts.john.name,
    },
    created: getDate(540),
    blocks: [
      {
        type: 'transcription',
        started: getDate(540),
        text: "Excellent. Let's wrap up with action items. Emma, can you lead the marketing budget reallocation for Q4?",
      },
    ],
  }),
  create(MessageType, {
    sender: {
      name: contacts.emma.name,
    },
    created: getDate(570),
    blocks: [
      {
        type: 'transcription',
        started: getDate(570),
        text: "Yes, I'll work with the marketing team to focus on high-performing channels as recommended in the Q3 report.",
      },
    ],
  }),
  create(MessageType, {
    sender: {
      name: contacts.john.name,
    },
    created: getDate(600),
    blocks: [
      {
        type: 'transcription',
        started: getDate(600),
        text: 'Sarah, please continue leading the product release and coordinate with Jennifer on the security features.',
      },
    ],
  }),
  create(MessageType, {
    sender: {
      name: contacts.sarah.name,
    },
    created: getDate(630),
    blocks: [
      {
        type: 'transcription',
        started: getDate(630),
        text: "Will do. I'll also follow up with Michael about the Singapore regulatory requirements for our Asia expansion.",
      },
    ],
  }),
  create(MessageType, {
    sender: {
      name: contacts.john.name,
    },
    created: getDate(660),
    blocks: [
      {
        type: 'transcription',
        started: getDate(660),
        text: 'And David, please finalize the accounts receivable report and continue your analysis of the TechGiant offer with Alex.',
      },
    ],
  }),
  create(MessageType, {
    sender: {
      name: contacts.david.name,
    },
    created: getDate(690),
    blocks: [
      {
        type: 'transcription',
        started: getDate(690),
        text: "I'm on it. I'll have a detailed analysis ready for our next meeting.",
      },
    ],
  }),
  create(MessageType, {
    sender: {
      name: contacts.john.name,
    },
    created: getDate(720),
    blocks: [
      {
        type: 'transcription',
        started: getDate(720),
        text: "Great. Thanks everyone for a productive meeting. Let's reconvene next week to follow up on these items.",
      },
    ],
  }),
];
