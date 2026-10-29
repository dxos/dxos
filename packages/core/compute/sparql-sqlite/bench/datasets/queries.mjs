//
// Copyright 2026 DXOS.org
//

// Fixed query sets for the real-data benchmark. BSBM and WatDiv are instantiated from their generators'
// templates by `prepare.sh`; LUBM's 14 queries and the DBLP set are fixed text.

const UB =
  'PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\nPREFIX ub: <http://swat.cse.lehigh.edu/onto/univ-bench.owl#>\n';

/**
 * The 14 LUBM queries (swat.cse.lehigh.edu/projects/lubm/queries-sparql.txt), with the namespace the UBA 1.7
 * generator writes (`-onto http://swat.cse.lehigh.edu/onto/univ-bench.owl`) and the published text's unbracketed
 * IRIs and commas fixed. `inference` names what a query needs to return its intended answer.
 */
export const LUBM = [
  [
    'L-Q1',
    'none',
    `SELECT ?X WHERE { ?X rdf:type ub:GraduateStudent . ?X ub:takesCourse <http://www.Department0.University0.edu/GraduateCourse0> }`,
  ],
  [
    'L-Q2',
    'subClassOf',
    `SELECT ?X ?Y ?Z WHERE { ?X rdf:type ub:GraduateStudent . ?Y rdf:type ub:University . ?Z rdf:type ub:Department . ?X ub:memberOf ?Z . ?Z ub:subOrganizationOf ?Y . ?X ub:undergraduateDegreeFrom ?Y }`,
  ],
  [
    'L-Q3',
    'none',
    `SELECT ?X WHERE { ?X rdf:type ub:Publication . ?X ub:publicationAuthor <http://www.Department0.University0.edu/AssistantProfessor0> }`,
  ],
  [
    'L-Q4',
    'subClassOf',
    `SELECT ?X ?Y1 ?Y2 ?Y3 WHERE { ?X rdf:type ub:Professor . ?X ub:worksFor <http://www.Department0.University0.edu> . ?X ub:name ?Y1 . ?X ub:emailAddress ?Y2 . ?X ub:telephone ?Y3 }`,
  ],
  [
    'L-Q5',
    'subClassOf+subPropertyOf',
    `SELECT ?X WHERE { ?X rdf:type ub:Person . ?X ub:memberOf <http://www.Department0.University0.edu> }`,
  ],
  ['L-Q6', 'subClassOf', `SELECT ?X WHERE { ?X rdf:type ub:Student }`],
  [
    'L-Q7',
    'subClassOf',
    `SELECT ?X ?Y WHERE { ?X rdf:type ub:Student . ?Y rdf:type ub:Course . ?X ub:takesCourse ?Y . <http://www.Department0.University0.edu/AssociateProfessor0> ub:teacherOf ?Y }`,
  ],
  [
    'L-Q8',
    'subClassOf',
    `SELECT ?X ?Y ?Z WHERE { ?X rdf:type ub:Student . ?Y rdf:type ub:Department . ?X ub:memberOf ?Y . ?Y ub:subOrganizationOf <http://www.University0.edu> . ?X ub:emailAddress ?Z }`,
  ],
  [
    'L-Q9',
    'subClassOf',
    `SELECT ?X ?Y ?Z WHERE { ?X rdf:type ub:Student . ?Y rdf:type ub:Faculty . ?Z rdf:type ub:Course . ?X ub:advisor ?Y . ?Y ub:teacherOf ?Z . ?X ub:takesCourse ?Z }`,
  ],
  [
    'L-Q10',
    'subClassOf',
    `SELECT ?X WHERE { ?X rdf:type ub:Student . ?X ub:takesCourse <http://www.Department0.University0.edu/GraduateCourse0> }`,
  ],
  [
    'L-Q11',
    'transitive',
    `SELECT ?X WHERE { ?X rdf:type ub:ResearchGroup . ?X ub:subOrganizationOf <http://www.University0.edu> }`,
  ],
  [
    'L-Q12',
    'owl',
    `SELECT ?X ?Y WHERE { ?X rdf:type ub:Chair . ?Y rdf:type ub:Department . ?X ub:worksFor ?Y . ?Y ub:subOrganizationOf <http://www.University0.edu> }`,
  ],
  ['L-Q13', 'inverseOf', `SELECT ?X WHERE { ?X rdf:type ub:Person . <http://www.University0.edu> ub:hasAlumnus ?X }`],
  ['L-Q14', 'none', `SELECT ?X WHERE { ?X rdf:type ub:UndergraduateStudent }`],
].map(([id, inference, sparql]) => ({ id, family: 'lubm', inference, sparql: UB + sparql }));

const DBLP_PREFIX =
  'PREFIX dblp: <https://dblp.org/rdf/schema#>\nPREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\nPREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\nPREFIX xsd: <http://www.w3.org/2001/XMLSchema#>\nPREFIX owl: <http://www.w3.org/2002/07/owl#>\n';

/** Realistic DBLP queries over the first ~6M lines of dblp.nt (publication records and their signatures). */
export const DBLP = [
  [
    'D1-lookup',
    'lookup',
    `SELECT ?p ?title ?year WHERE { ?p dblp:doi <https://doi.org/10.1145/337292.337434> ; dblp:title ?title ; dblp:yearOfPublication ?year }`,
  ],
  [
    'D2-star',
    'star',
    `SELECT ?title ?year ?venue ?type ?pages ?n WHERE { <https://dblp.org/rec/conf/dac/NewtonRMSB00> dblp:title ?title ; dblp:yearOfPublication ?year ; dblp:bibtexType ?type ; dblp:numberOfCreators ?n . OPTIONAL { <https://dblp.org/rec/conf/dac/NewtonRMSB00> dblp:publishedIn ?venue } OPTIONAL { <https://dblp.org/rec/conf/dac/NewtonRMSB00> dblp:pagination ?pages } }`,
  ],
  [
    'D3-authors-of-pub',
    'star+join',
    `SELECT ?ord ?name ?orcid WHERE { <https://dblp.org/rec/conf/dac/NewtonRMSB00> dblp:hasSignature ?sig . ?sig dblp:signatureOrdinal ?ord ; dblp:signatureDblpName ?name . OPTIONAL { ?sig dblp:signatureOrcid ?orcid } } ORDER BY ?ord`,
  ],
  [
    'D4-pubs-of-author',
    'join',
    `SELECT ?p ?title ?year WHERE { ?p dblp:authoredBy <https://dblp.org/pid/97/5026> ; dblp:title ?title ; dblp:yearOfPublication ?year } ORDER BY DESC(?year)`,
  ],
  [
    'D5-coauthors',
    '2-hop',
    `SELECT ?co (COUNT(?p) AS ?n) WHERE { ?p dblp:authoredBy <https://dblp.org/pid/97/5026> . ?p dblp:authoredBy ?co . FILTER (?co != <https://dblp.org/pid/97/5026>) } GROUP BY ?co ORDER BY DESC(?n) LIMIT 20`,
  ],
  [
    'D6-per-year',
    'aggregate',
    `SELECT ?year (COUNT(?p) AS ?n) WHERE { ?p dblp:yearOfPublication ?year } GROUP BY ?year ORDER BY ?year`,
  ],
  [
    'D7-per-type-venue',
    'aggregate',
    `SELECT ?type ?venue (COUNT(?p) AS ?n) WHERE { ?p dblp:bibtexType ?type ; dblp:publishedIn ?venue } GROUP BY ?type ?venue ORDER BY DESC(?n) LIMIT 20`,
  ],
  [
    'D8-text',
    'text',
    `SELECT ?p ?title WHERE { ?p dblp:title ?title . FILTER (CONTAINS(LCASE(?title), "neural network")) } LIMIT 100`,
  ],
  [
    'D9-text-year',
    'text+range',
    `SELECT ?p ?title ?year WHERE { ?p dblp:title ?title ; dblp:yearOfPublication ?year . FILTER (xsd:integer(STR(?year)) >= 2020 && REGEX(?title, "^Deep", "i")) } ORDER BY ?title LIMIT 50`,
  ],
  [
    'D10-prolific',
    'aggregate+join',
    `SELECT ?a (COUNT(DISTINCT ?p) AS ?n) WHERE { ?p dblp:authoredBy ?a ; dblp:yearOfPublication ?year . FILTER (STR(?year) = "2019") } GROUP BY ?a ORDER BY DESC(?n) LIMIT 10`,
  ],
  [
    'D11-no-doi',
    'optional/negation',
    `SELECT (COUNT(?p) AS ?n) WHERE { ?p rdf:type dblp:Inproceedings . FILTER NOT EXISTS { ?p dblp:doi ?doi } }`,
  ],
  [
    'D12-path',
    'property path',
    `SELECT ?name WHERE { <https://dblp.org/rec/conf/dac/NewtonRMSB00> dblp:hasSignature/dblp:signatureCreator/^dblp:signatureCreator/dblp:signatureDblpName ?name } LIMIT 100`,
  ],
  ['D13-versions', 'path +', `SELECT ?v ?root WHERE { ?v dblp:isVersionOf+ ?root } LIMIT 100`],
  ['D14-sameAs-count', 'count', `SELECT (COUNT(*) AS ?n) WHERE { ?p owl:sameAs ?x }`],
  // Rewrite of D10 with the year as a constant term: what an equality pushdown of STR(?y) = "..." would emit.
  [
    'D10r-prolific-const',
    'aggregate+join',
    `SELECT ?a (COUNT(DISTINCT ?p) AS ?n) WHERE { ?p dblp:yearOfPublication "2019"^^xsd:gYear ; dblp:authoredBy ?a } GROUP BY ?a ORDER BY DESC(?n) LIMIT 10`,
  ],
  // Known compiler gaps (fallback candidates): DESCRIBE, a quantified REGEX, DATATYPE().
  ['D15-describe', 'gap: DESCRIBE', `DESCRIBE <https://dblp.org/rec/conf/dac/NewtonRMSB00>`],
  [
    'D16-regex-quantified',
    'gap: REGEX',
    `SELECT ?p ?title WHERE { ?p dblp:title ?title . FILTER REGEX(?title, "^(deep|neural) [a-z]+ networks?", "i") } LIMIT 100`,
  ],
  [
    'D17-datatype',
    'gap: DATATYPE',
    `SELECT ?dt (COUNT(*) AS ?n) WHERE { ?p dblp:yearOfPublication ?y . BIND (DATATYPE(?y) AS ?dt) } GROUP BY ?dt`,
  ],
].map(([id, kind, sparql]) => ({ id, family: 'dblp', kind, sparql: DBLP_PREFIX + sparql }));
