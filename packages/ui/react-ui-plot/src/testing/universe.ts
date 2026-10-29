//
// Copyright 2026 DXOS.org
//

import { type PlotValue } from '../types.ts';

/**
 * The history of the universe in about a hundred events, a header row then one event per row: from the Big Bang
 * 13.8 billion years ago to the present. Deep time is in years ago (`13.8 Gya`, `66 Mya`, `300 kya`), recorded history
 * in years (negative before the common era). `Physics` is the universe, stars and planets; `Biology` is life;
 * `Humans` is our lineage, our history and what we learned of the other two.
 */
export const universeTimeline: PlotValue[][] = [
  ['Date', 'Category', 'Event', 'Description', 'Image'],

  // Physics.
  ['13.8 Gya', 'Physics', 'Big Bang', 'The universe begins hot and dense, and starts to expand.', null],
  [
    '13.8 Gya',
    'Physics',
    'Cosmic inflation',
    'A fraction of a second of exponential expansion smooths and flattens space.',
    null,
  ],
  [
    '13.8 Gya',
    'Physics',
    'First nuclei',
    'In the first minutes, protons and neutrons fuse into hydrogen, helium and a trace of lithium.',
    null,
  ],
  [
    '13.8 Gya',
    'Physics',
    'Recombination',
    'About 380,000 years in, electrons join nuclei into atoms; the light set free is the cosmic microwave background.',
    null,
  ],
  ['13.6 Gya', 'Physics', 'First stars', 'Massive stars of hydrogen and helium light up the dark ages.', null],
  ['13.4 Gya', 'Physics', 'First galaxies', 'Stars gather into the earliest galaxies.', null],
  [
    '12.8 Gya',
    'Physics',
    'Reionization ends',
    'Light from the first stars and galaxies ionizes the gas between them.',
    null,
  ],
  ['10 Gya', 'Physics', 'Cosmic noon', 'Star formation across the universe peaks.', null],
  [
    '8.8 Gya',
    'Physics',
    "Milky Way's disk",
    'The thin disk of our galaxy, where the Sun will form, takes shape.',
    null,
  ],
  ['5 Gya', 'Physics', 'Dark energy takes over', 'The expansion of the universe begins to accelerate.', null],
  ['4.6 Gya', 'Physics', 'The Sun forms', 'A collapsing cloud of gas and dust ignites a star.', null],
  ['4.54 Gya', 'Physics', 'Earth forms', 'Rock and metal accrete from the disk around the young Sun.', null],
  ['4.5 Gya', 'Physics', 'The Moon forms', 'A Mars-sized body strikes Earth; the debris gathers into the Moon.', null],
  ['4.4 Gya', 'Physics', 'First oceans', "The oldest zircon crystals show liquid water on Earth's surface.", null],
  ['4.1 Gya', 'Physics', 'Late Heavy Bombardment', 'Asteroids and comets batter the inner planets.', null],
  ['3 Gya', 'Physics', 'First continents', 'Stable continental crust begins to rise above the oceans.', null],
  [
    '2.4 Gya',
    'Physics',
    'Huronian glaciation',
    'Ice covers much of Earth as oxygen strips methane from the air.',
    null,
  ],
  ['2.02 Gya', 'Physics', 'Vredefort impact', 'The largest known impact crater on Earth forms in South Africa.', null],
  ['1.1 Gya', 'Physics', 'Rodinia', 'The continents gather into a supercontinent.', null],
  ['720 Mya', 'Physics', 'Snowball Earth', 'Ice reaches the equator in the Sturtian glaciation.', null],
  ['335 Mya', 'Physics', 'Pangaea', 'The continents join into a single landmass.', null],
  ['175 Mya', 'Physics', 'Pangaea breaks up', 'The Atlantic Ocean opens as the continents drift apart.', null],
  ['66 Mya', 'Physics', 'Chicxulub impact', 'An asteroid about 10 km across strikes the Yucatán.', null],
  ['50 Mya', 'Physics', 'India meets Asia', 'The collision begins to raise the Himalayas.', null],
  ['2.6 Mya', 'Physics', 'Ice ages begin', "The Quaternary's cycles of glaciation start.", null],
  [
    '20 kya',
    'Physics',
    'Last Glacial Maximum',
    'Ice sheets reach their greatest extent; sea level is about 120 m lower.',
    null,
  ],
  ['1054', 'Physics', 'Crab supernova', 'A star explodes, bright enough to see by day for weeks.', null],

  // Biology.
  ['4.1 Gya', 'Biology', 'Earliest signs of life', 'Carbon in a zircon crystal hints at life.', null],
  ['3.7 Gya', 'Biology', 'Oldest stromatolites', 'Layered mounds built by microbial mats.', null],
  ['3.4 Gya', 'Biology', 'Photosynthesis', 'Bacteria capture sunlight, without yet releasing oxygen.', null],
  ['2.7 Gya', 'Biology', 'Cyanobacteria', 'Oxygen-producing photosynthesis evolves.', null],
  ['2.4 Gya', 'Biology', 'Great Oxidation Event', 'Oxygen from cyanobacteria accumulates in the atmosphere.', null],
  ['1.8 Gya', 'Biology', 'Eukaryotes', 'Cells with nuclei and mitochondria appear.', null],
  ['1.05 Gya', 'Biology', 'Sexual reproduction', 'The red alga Bangiomorpha is its earliest known example.', null],
  ['575 Mya', 'Biology', 'Ediacaran biota', 'The first large, complex animals live on the sea floor.', null],
  [
    '539 Mya',
    'Biology',
    'Cambrian explosion',
    'Most major animal groups appear in a few tens of millions of years.',
    null,
  ],
  ['470 Mya', 'Biology', 'Plants on land', 'Simple plants colonize the continents.', null],
  ['443 Mya', 'Biology', 'Ordovician extinction', 'The first of the five great mass extinctions.', null],
  ['420 Mya', 'Biology', 'Jawed fish', 'Jaws open new ways to feed.', null],
  ['375 Mya', 'Biology', 'Tiktaalik', 'A fish with limb-like fins, between fish and the first land vertebrates.', null],
  ['372 Mya', 'Biology', 'Late Devonian extinction', 'Reefs and much of marine life collapse.', null],
  ['312 Mya', 'Biology', 'Amniotes', 'Eggs that survive on land free vertebrates from the water.', null],
  ['300 Mya', 'Biology', 'Giant insects', 'Oxygen-rich Carboniferous air supports dragonflies with 70 cm wings.', null],
  [
    '252 Mya',
    'Biology',
    'The Great Dying',
    'The Permian-Triassic extinction ends about nine in ten marine species.',
    null,
  ],
  ['233 Mya', 'Biology', 'First dinosaurs', 'Small, fast dinosaurs appear in the Triassic.', null],
  ['225 Mya', 'Biology', 'First mammals', 'Small, mostly nocturnal mammals evolve alongside the dinosaurs.', null],
  ['201 Mya', 'Biology', 'Triassic-Jurassic extinction', 'Clears the way for dinosaurs to dominate.', null],
  ['150 Mya', 'Biology', 'Archaeopteryx', 'A feathered dinosaur on the way to birds.', null],
  ['130 Mya', 'Biology', 'Flowering plants', 'Flowers and their pollinators spread.', null],
  [
    '66 Mya',
    'Biology',
    'Dinosaurs die out',
    'The K-Pg extinction ends the non-avian dinosaurs; mammals radiate.',
    null,
  ],
  ['55 Mya', 'Biology', 'First primates', 'Small tree-dwelling primates appear.', null],
  ['50 Mya', 'Biology', 'Whales return to the sea', 'Land mammals begin their transition to whales.', null],
  ['7 Mya', 'Biology', 'Humans and chimpanzees split', 'The last common ancestor of the two lineages.', null],

  // Humans.
  ['3.3 Mya', 'Humans', 'First stone tools', 'Flaked stones at Lomekwi, Kenya.', null],
  ['3.2 Mya', 'Humans', 'Lucy', 'Australopithecus afarensis walks upright.', null],
  ['2.8 Mya', 'Humans', 'Genus Homo', 'The earliest members of our genus.', null],
  ['1.9 Mya', 'Humans', 'Homo erectus', 'The first human species to spread beyond Africa.', null],
  ['1 Mya', 'Humans', 'Control of fire', 'Ash and burnt bone in Wonderwerk Cave.', null],
  ['400 kya', 'Humans', 'Neanderthals', 'A human species adapted to Ice Age Europe.', null],
  ['300 kya', 'Humans', 'Homo sapiens', 'The oldest known fossils of our species, at Jebel Irhoud, Morocco.', null],
  ['70 kya', 'Humans', 'Out of Africa', 'Modern humans spread across the world.', null],
  ['45 kya', 'Humans', 'Cave art', 'Painted animals in Sulawesi, among the oldest known figurative art.', null],
  ['40 kya', 'Humans', 'Neanderthals disappear', 'Leaving a trace of their DNA in most living people.', null],
  ['15 kya', 'Humans', 'Dogs', 'Wolves become the first domesticated animal.', null],
  ['12 kya', 'Humans', 'Agriculture', 'Farming begins in the Fertile Crescent.', null],
  ['-9500', 'Humans', 'Göbekli Tepe', 'Monumental stone enclosures, built before farming took hold.', null],
  ['-3200', 'Humans', 'Writing', 'Cuneiform in Sumer.', null],
  ['-2560', 'Humans', 'Great Pyramid', 'Built at Giza for the pharaoh Khufu.', null],
  ['-1200', 'Humans', 'Iron Age', 'Iron working spreads across the Near East.', null],
  ['-508', 'Humans', 'Athenian democracy', "Cleisthenes' reforms give power to the citizens.", null],
  ['-221', 'Humans', 'China unified', 'The Qin dynasty founds an empire.', null],
  ['-200', 'Humans', 'Eratosthenes measures Earth', "Shadows in two cities give the planet's circumference.", null],
  ['1440', 'Humans', 'Printing press', "Gutenberg's movable type.", null],
  ['1492', 'Humans', 'Columbus reaches the Americas', "Joining the hemispheres' histories.", null],
  ['1543', 'Humans', 'Copernicus', 'The Sun, not Earth, at the center.', null],
  ['1609', 'Humans', "Galileo's telescope", 'Moons of Jupiter, phases of Venus, mountains on the Moon.', null],
  ['1687', 'Humans', "Newton's Principia", 'Laws of motion and universal gravitation.', null],
  ['1760', 'Humans', 'Industrial Revolution', 'Steam power and factories begin in Britain.', null],
  ['1859', 'Humans', 'On the Origin of Species', "Darwin's theory of evolution by natural selection.", null],
  ['1869', 'Humans', 'Periodic table', 'Mendeleev arranges the elements and predicts missing ones.', null],
  ['1905', 'Humans', 'Special relativity', 'Einstein unites space and time.', null],
  ['1915', 'Humans', 'General relativity', 'Gravity as the curvature of spacetime.', null],
  ['1925', 'Humans', 'Quantum mechanics', 'Heisenberg and Schrödinger describe the atom.', null],
  [
    '1929',
    'Humans',
    'The universe is expanding',
    'Hubble finds galaxies receding in proportion to their distance.',
    null,
  ],
  ['1945', 'Humans', 'Atomic bomb', 'Nuclear fission as a weapon.', null],
  ['1953', 'Humans', 'Structure of DNA', 'Watson, Crick and Franklin find the double helix.', null],
  ['1957', 'Humans', 'Sputnik', 'The first artificial satellite.', null],
  ['1965', 'Humans', 'Cosmic microwave background', "Penzias and Wilson hear the Big Bang's afterglow.", null],
  ['1969', 'Humans', 'Moon landing', 'Apollo 11 lands people on the Moon.', null],
  ['1990', 'Humans', 'Hubble Space Telescope', 'A telescope above the atmosphere.', null],
  ['1998', 'Humans', 'Accelerating expansion', 'Distant supernovae reveal dark energy.', null],
  ['2003', 'Humans', 'Human genome', 'The first complete sequence of human DNA.', null],
  ['2012', 'Humans', 'Higgs boson', 'Found at the Large Hadron Collider.', null],
  ['2015', 'Humans', 'Gravitational waves', 'LIGO hears two black holes merge.', null],
  ['2019', 'Humans', 'Black hole image', "The Event Horizon Telescope images M87's black hole.", null],
  ['2022', 'Humans', 'James Webb Space Telescope', 'Its first images reach back toward the first galaxies.', null],
];

/** The categories in the order they are listed and laid out. */
export const universeTimelineOrder = ['Physics', 'Biology', 'Humans'];

/** Each category in its own hue. */
export const universeTimelineColors: Record<string, string> = {
  Physics: 'indigo',
  Biology: 'green',
  Humans: 'amber',
};
