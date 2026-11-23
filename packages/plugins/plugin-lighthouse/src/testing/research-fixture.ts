//
// Copyright 2026 DXOS.org
//

import { type Entity, type Session } from '#client';

/** A deep extension's research session: Fuego's menu (lighthouse run ext-menu-fuego-20261027-200621-zev, 194 dishes). */
export const FUEGO_CHILD: Session = {
  run: 'ext-menu-fuego-20261027-200621-zev',
  goal: 'Find the dishes on the menu of Fuego.',
  status: 'reported',
  busy: false,
  budget: { minutes: 6, usd: 0.06, pages: 14 },
  spent: { seconds: 180, usd: 0.019, pages: 10 },
  parent: { run: 'web-20261028-120000', subject: 'https://example.com/cafes/meeple-bangkok', extension: 'menu' },
};

/** 40 of the 194 dishes, across the menu's sections. */
export const fuegoDishes: Entity[] = [
  {
    id: 'https://app.papaya.co.th/fuego/fuego/menu#01KYM1P79AW3W4Y8HCH3K46AE8',
    types: ['schema:MenuItem'],
    props: {
      'schema:name': ['Porcini & Shiitake Flatbread'],
      'lh:price': [290],
      'lh:currency': ['THB'],
      'schema:description': [
        'Charcoal-grilled porcini mushroom flatbread, topped with burned eggplant and honey puree, shiitake nimono, mascarpone cheese, Spanish pickled chili and grated chestnuts.',
      ],
      'lh:menuSection': ['Food — Specials (only available for a limited time)'],
    },
  },
  {
    id: 'https://app.papaya.co.th/fuego/fuego/menu#01HAPDB6CRN9RZC10ZMYG36JGB',
    types: ['schema:MenuItem'],
    props: {
      'schema:name': ['Uni Tostada (per piece)'],
      'lh:price': [510],
      'lh:currency': ['THB'],
      'schema:description': ['A harmony of corn and fresh Japanese sea urchin'],
      'lh:menuSection': ['Food — Signatures'],
    },
  },
  {
    id: 'https://app.papaya.co.th/fuego/fuego/menu#01HAPDECVG1TWKHX6RGESD0SAY',
    types: ['schema:MenuItem'],
    props: {
      'schema:name': ['Padron Peppers'],
      'lh:price': [340],
      'lh:currency': ['THB'],
      'schema:description': ['Perfectly fried Spanish “Russian Roulette” peppers'],
      'lh:menuSection': ['Food — Classics'],
    },
  },
  {
    id: 'https://app.papaya.co.th/fuego/fuego/menu#01HAPDG7HSSYVEXCT7X1ZPF2DJ',
    types: ['schema:MenuItem'],
    props: {
      'schema:name': ['Umami Salad'],
      'lh:price': [300],
      'lh:currency': ['THB'],
      'schema:description': ['Fresh Japanese cherry tomato with honey-mustard vinaigrette and \ncaramelized walnuts'],
      'lh:menuSection': ['Food — Greens'],
    },
  },
  {
    id: 'https://app.papaya.co.th/fuego/fuego/menu#01KA11BYGMZHEB6S3TC80EPRAR',
    types: ['schema:MenuItem'],
    props: {
      'schema:name': ['Branzino, Fennel & Miso'],
      'lh:price': [790],
      'lh:currency': ['THB'],
      'schema:description': [
        'Charcoal-grilled Branzino seabass, Fennel & miso sauce, topped with fennel and orange salad',
      ],
      'lh:menuSection': ['Food — Grill'],
    },
  },
  {
    id: 'https://app.papaya.co.th/fuego/fuego/menu#01HAPDH4SHHGA4KYBVH4PJA0Z4',
    types: ['schema:MenuItem'],
    props: {
      'schema:name': ['Squid Ink Paella'],
      'lh:price': [899],
      'lh:currency': ['THB'],
      'schema:description': ['Squid ink paella topped with charcoal grilled prawns'],
      'lh:menuSection': ['Food — Rice'],
    },
  },
  {
    id: 'https://app.papaya.co.th/fuego/fuego/menu#01HAPDRQ80F19SZ0MS0JT6N6EM',
    types: ['schema:MenuItem'],
    props: {
      'schema:name': ['Miso Cheesecake'],
      'lh:price': [290],
      'lh:currency': ['THB'],
      'schema:description': ['Our Signature melty Basque cheesecake made the “Fuego” way'],
      'lh:menuSection': ['Food — Desserts'],
    },
  },
  {
    id: 'https://app.papaya.co.th/fuego/fuego/menu#01JDSFQY6AFJ6A6PN2W97VPYZN',
    types: ['schema:MenuItem'],
    props: {
      'schema:name': ['Uni Tostada (2pc)'],
      'lh:price': [0],
      'lh:currency': ['THB'],
      'schema:description': ['A harmony of corn and fresh Japanese sea urchin'],
      'lh:menuSection': [
        'Best Sellers Set Menu — Best Sellers Set Menu 3,490thb++ (Set for 2 people. Price per person)',
      ],
    },
  },
  {
    id: 'https://app.papaya.co.th/fuego/fuego/menu#01M00A5YRMVMJ47327XKJQZ35N',
    types: ['schema:MenuItem'],
    props: {
      'schema:name': ['1st, Crimson Float paired with Ankimo & Uni Tostada'],
      'lh:price': [0],
      'lh:currency': ['THB'],
      'schema:description': [
        'Pairing Notes: Bright Apple, elder flower, and lime lift the richness of ankimo and uni, while the red wine float adds depth and lenght.',
      ],
      'lh:menuSection': ['Best Sellers Set Menu — Best sellers Cocktail Pairing 1,990thb ++ (6 Cocktails)'],
    },
  },
  {
    id: 'https://app.papaya.co.th/fuego/fuego/menu#01JTANE0F6QSQH0SJH4AVJ46K3',
    types: ['schema:MenuItem'],
    props: {
      'schema:name': ['Padron Peppers'],
      'lh:price': [0],
      'lh:currency': ['THB'],
      'schema:description': ['Perfectly fried Spanish “Russian Roulette” peppers'],
      'lh:menuSection': ['FUEGO Tapas Set — FUEGO Tapas Set 1,950thb++ (Set for 2 people. Price per person)'],
    },
  },
  {
    id: 'https://app.papaya.co.th/fuego/fuego/menu#01KBPTR6V4XZN7ZRWREFBYYD0H',
    types: ['schema:MenuItem'],
    props: {
      'schema:name': ['Yuzu Flamenco'],
      'lh:price': [480],
      'lh:currency': ['THB'],
      'schema:description': [
        'Shio-Yuzu Sake, Peach Liqueur, Cava & Soda\n\nTASTE: A bright sparkling cocktail with refreshing yuzu citrus, juicy peach, crisp cava, and a lively, refreshing finish.',
      ],
      'lh:menuSection': ['Drinks — Signature cocktails'],
    },
  },
  {
    id: 'https://app.papaya.co.th/fuego/fuego/menu#01JZ8056F6W33BPN5GRR49MCM2',
    types: ['schema:MenuItem'],
    props: {
      'schema:name': ['Kaku Highball'],
      'lh:price': [320],
      'lh:currency': ['THB'],
      'schema:description': [
        'Suntory Kakubin Japanese Whiskey, Soda, Lemon Peel\n\nTASTE: The traditional Japanese highball. Refreshing and easy-drinking with smooth whisky, subtle vanilla and honey notes, finished crisp with sparkling soda.',
      ],
      'lh:menuSection': ['Drinks — Highballs'],
    },
  },
  {
    id: 'https://app.papaya.co.th/fuego/fuego/menu#01HAP2VANGXGV3RM87FRVE62ZR',
    types: ['schema:MenuItem'],
    props: {
      'schema:name': ['Red Wine Sangria (jar)'],
      'lh:price': [1580],
      'lh:currency': ['THB'],
      'lh:menuSection': ['Drinks — Sangria'],
    },
  },
  {
    id: 'https://app.papaya.co.th/fuego/fuego/menu#01JZ83XTJB8XBW8CHFCWXCA077',
    types: ['schema:MenuItem'],
    props: {
      'schema:name': ['Rosado Cloud'],
      'lh:price': [280],
      'lh:currency': ['THB'],
      'schema:description': [
        'Rose Syrup, Apple juice, Fresh Lemon Juice, Peach Soda, Pink Guava Foam\n\nTASTE: Delicately floral with rose, crisp apple, bright lemon, sparkling peach soda, and a light pink guava foam finish.',
      ],
      'lh:menuSection': ['Drinks — Mocktails'],
    },
  },
  {
    id: 'https://app.papaya.co.th/fuego/fuego/menu#01JZ85FHEBN3B25YQBN9FQ8VCE',
    types: ['schema:MenuItem'],
    props: {
      'schema:name': ['Fire Kiss (6 shot)'],
      'lh:price': [690],
      'lh:currency': ['THB'],
      'schema:description': [
        'Fire Ball\tWhiskey, Apple Juice, Lemon Juice, Tabasco Sauce \t\n\nTASTE: A bold and spicy shot—sweet cinnamon Fireball blended with crisp apple, zesty lemon, and a dash of Tabasco. Sweet, sour, and spicy in one fiery sip.',
      ],
      'lh:menuSection': ['Drinks — Shots'],
    },
  },
  {
    id: 'https://app.papaya.co.th/fuego/fuego/menu#01HAP3G2SWXG14EH9EHWV0P4TR',
    types: ['schema:MenuItem'],
    props: {
      'schema:name': ['Tanqueray (glass)'],
      'lh:price': [320],
      'lh:currency': ['THB'],
      'lh:menuSection': ['Drinks — Gin'],
    },
  },
  {
    id: 'https://app.papaya.co.th/fuego/fuego/menu#01HSV35WYFZWP169W36HM0FAT8',
    types: ['schema:MenuItem'],
    props: {
      'schema:name': ['Jose Cuervo Gold (shot)'],
      'lh:price': [350],
      'lh:currency': ['THB'],
      'lh:menuSection': ['Drinks — Tequila & Mezcal'],
    },
  },
  {
    id: 'https://app.papaya.co.th/fuego/fuego/menu#01HAP6HKRJQ7XS5AX0FHCT1BVH',
    types: ['schema:MenuItem'],
    props: {
      'schema:name': ['Suntory Kakubin (glass)'],
      'lh:price': [350],
      'lh:currency': ['THB'],
      'lh:menuSection': ['Drinks — Whiskey & Single Malt'],
    },
  },
  {
    id: 'https://app.papaya.co.th/fuego/fuego/menu#01HAP6SFRVD8R1HPTGZGPDGHNN',
    types: ['schema:MenuItem'],
    props: {
      'schema:name': ['Myoshino no Sakura Umeshu (glass)'],
      'lh:price': [320],
      'lh:currency': ['THB'],
      'lh:menuSection': ['Drinks — Umeshu & yuzushu'],
    },
  },
  {
    id: 'https://app.papaya.co.th/fuego/fuego/menu#01J3MPPK4X2KYXJ0YG19GR9BG4',
    types: ['schema:MenuItem'],
    props: {
      'schema:name': ['Tanigawadake Junmai Super Dry Karakuchi 300ML'],
      'lh:price': [890],
      'lh:currency': ['THB'],
      'lh:menuSection': ['Drinks — Sake'],
    },
  },
  {
    id: 'https://app.papaya.co.th/fuego/fuego/menu#01K0EGS9E43WRS4WF7FSDHM62W',
    types: ['schema:MenuItem'],
    props: {
      'schema:name': ['Grifoll Cava Brut (Glass)'],
      'lh:price': [390],
      'lh:currency': ['THB'],
      'schema:description': ['Macabeu, Chardonnay. Cava; Spain'],
      'lh:menuSection': ['Drinks — Cava & champagne'],
    },
  },
  {
    id: 'https://app.papaya.co.th/fuego/fuego/menu#01K0EF3AVDWWCY4QZ1M8BQBR9K',
    types: ['schema:MenuItem'],
    props: {
      'schema:name': ['Perro Verde (glass)'],
      'lh:price': [390],
      'lh:currency': ['THB'],
      'schema:description': ['Verdejo; Rueda; Spain'],
      'lh:menuSection': ['Drinks — White wine'],
    },
  },
  {
    id: 'https://app.papaya.co.th/fuego/fuego/menu#01K0EGX04BM23NW8ATJC7WG77T',
    types: ['schema:MenuItem'],
    props: {
      'schema:name': ['Born Rosé'],
      'lh:price': [2100],
      'lh:currency': ['THB'],
      'schema:description': ['Grenache, Tempranillo; Catalunya; Spain'],
      'lh:menuSection': ['Drinks — Rosé'],
    },
  },
  {
    id: 'https://app.papaya.co.th/fuego/fuego/menu#01K0EG847Y0291G1J6JT709P5J',
    types: ['schema:MenuItem'],
    props: {
      'schema:name': ['Cantos de Valpiedra (glass)'],
      'lh:price': [390],
      'lh:currency': ['THB'],
      'schema:description': ['Tempranillo; Rioja; Spain'],
      'lh:menuSection': ['Drinks — Red wine'],
    },
  },
  {
    id: 'https://app.papaya.co.th/fuego/fuego/menu#01HAP3XYFGF0P90QWY4TYZ2RQD',
    types: ['schema:MenuItem'],
    props: {
      'schema:name': ['Asahi'],
      'lh:price': [220],
      'lh:currency': ['THB'],
      'lh:menuSection': ['Drinks — Beer'],
    },
  },
  {
    id: 'https://app.papaya.co.th/fuego/fuego/menu#01HAP83F082DMPCX643FVQ8K8K',
    types: ['schema:MenuItem'],
    props: {
      'schema:name': ['Nordaq Still Water'],
      'lh:price': [180],
      'lh:currency': ['THB'],
      'lh:menuSection': ['Drinks — Water & soft drinks'],
    },
  },
  {
    id: 'https://app.papaya.co.th/fuego/fuego/menu#01KYM1SFRMJT451J5WA6MXB01K',
    types: ['schema:MenuItem'],
    props: {
      'schema:name': ['Carabineros Carpaccio'],
      'lh:price': [720],
      'lh:currency': ['THB'],
      'schema:description': [
        'Spanish Carabineros prawns carpaccio, served with green apple & saffron chutney, umami kombu emulsion, tangy sour cream and fried tarragon.',
      ],
      'lh:menuSection': ['Food — Specials (only available for a limited time)'],
    },
  },
  {
    id: 'https://app.papaya.co.th/fuego/fuego/menu#01HAPDC5AJQC3WY6S3FB7PQQ24',
    types: ['schema:MenuItem'],
    props: {
      'schema:name': ['Ankimo Toast (per piece)'],
      'lh:price': [390],
      'lh:currency': ['THB'],
      'schema:description': [
        'Japanese Monkfish liver, the ‘‘Foie Gras of the sea’’, served on top of charcoal grilled brioche',
      ],
      'lh:menuSection': ['Food — Signatures'],
    },
  },
  {
    id: 'https://app.papaya.co.th/fuego/fuego/menu#01HAPDEJKM0F3JGQ1FP02Q1KV6',
    types: ['schema:MenuItem'],
    props: {
      'schema:name': ['Iberico Croquette (per piece)'],
      'lh:price': [180],
      'lh:currency': ['THB'],
      'schema:description': ['Creamy croquette filled with the highest quality of Spanish iberico ham'],
      'lh:menuSection': ['Food — Classics'],
    },
  },
  {
    id: 'https://app.papaya.co.th/fuego/fuego/menu#01HE7QFY12WJV073KVGGR3RNVQ',
    types: ['schema:MenuItem'],
    props: {
      'schema:name': ['Charred Green Salad'],
      'lh:price': [290],
      'lh:currency': ['THB'],
      'schema:description': [
        'Grilled Baby Cos, egg & anchovy dressing, topped up with crispy croutons and Spanish Idiazabal cheese',
      ],
      'lh:menuSection': ['Food — Greens'],
    },
  },
  {
    id: 'https://app.papaya.co.th/fuego/fuego/menu#01HAPDPWHVGQTTS754AWTRVRZ4',
    types: ['schema:MenuItem'],
    props: {
      'schema:name': ['Tako Yaki'],
      'lh:price': [850],
      'lh:currency': ['THB'],
      'schema:description': ['Sous vide Spanish octopus served with an umami chorizo foam'],
      'lh:menuSection': ['Food — Grill'],
    },
  },
  {
    id: 'https://app.papaya.co.th/fuego/fuego/menu#01HAPDHGD4DFREGH7MMH8G70DY',
    types: ['schema:MenuItem'],
    props: {
      'schema:name': ['Mariscos Paella'],
      'lh:price': [899],
      'lh:currency': ['THB'],
      'schema:description': ['Our selection of mixed seafood paella'],
      'lh:menuSection': ['Food — Rice'],
    },
  },
  {
    id: 'https://app.papaya.co.th/fuego/fuego/menu#01HAPDRYYVK1F2DW70A5ZNPXW6',
    types: ['schema:MenuItem'],
    props: {
      'schema:name': ['Sake Kasu Churros'],
      'lh:price': [290],
      'lh:currency': ['THB'],
      'schema:description': ['Homemade churros served with a white chocolate sake sauce'],
      'lh:menuSection': ['Food — Desserts'],
    },
  },
  {
    id: 'https://app.papaya.co.th/fuego/fuego/menu#01JDSG50Q18GKC7Y8JXRB1R64Y',
    types: ['schema:MenuItem'],
    props: {
      'schema:name': ['Ankimo Toast (2pc)'],
      'lh:price': [0],
      'lh:currency': ['THB'],
      'schema:description': [
        'Japanese Monkfish liver, the ‘‘Foie Gras of the sea’’, served on top of charcoal grilled brioche',
      ],
      'lh:menuSection': [
        'Best Sellers Set Menu — Best Sellers Set Menu 3,490thb++ (Set for 2 people. Price per person)',
      ],
    },
  },
  {
    id: 'https://app.papaya.co.th/fuego/fuego/menu#01M00AF52F95JTMGY6GHGMR9P5',
    types: ['schema:MenuItem'],
    props: {
      'schema:name': ['2nd, Basque Sakura paired with Kanpanchi Tiradito & Tuna Tartare 2.0'],
      'lh:price': [0],
      'lh:currency': ['THB'],
      'schema:description': [
        "Pairing Notes: Tequila Herbal and peppery character compliments the fresh flavors of Kanpachi and Tuna, while lychee and citrus add brightness.\n\nThe saline notes from  Pippara Brine enhance the fish's natural and umami, pair beautifully with the sweet roasted piquillo pepper.",
      ],
      'lh:menuSection': ['Best Sellers Set Menu — Best sellers Cocktail Pairing 1,990thb ++ (6 Cocktails)'],
    },
  },
  {
    id: 'https://app.papaya.co.th/fuego/fuego/menu#01JTANJ1023W7D0B04J4PPG24W',
    types: ['schema:MenuItem'],
    props: {
      'schema:name': ['“Joselito” Iberico Ham (50g)'],
      'lh:price': [0],
      'lh:currency': ['THB'],
      'schema:description': ['Sliced Spanish “Joselito” iberico ham, the best money can buy'],
      'lh:menuSection': ['FUEGO Tapas Set — FUEGO Tapas Set 1,950thb++ (Set for 2 people. Price per person)'],
    },
  },
  {
    id: 'https://app.papaya.co.th/fuego/fuego/menu#01HAP3B604GBSW5HRYGDGVSD3T',
    types: ['schema:MenuItem'],
    props: {
      'schema:name': ['Rosa del Sol'],
      'lh:price': [380],
      'lh:currency': ['THB'],
      'schema:description': [
        'Japanese Whiskey, Tio Pepe Fino Sherry, Jasmine Syrup, Critic Acid, Soda, Pink Guava Foam\n\nTASTE: A refreshing whisky highball with floral jasmine, crisp fino sherry, lively citrus, and a delicate pink guava foam finish.',
      ],
      'lh:menuSection': ['Drinks — Signature cocktails'],
    },
  },
  {
    id: 'https://app.papaya.co.th/fuego/fuego/menu#01JZ8083TWMMNSNFE0XM2RMVX8',
    types: ['schema:MenuItem'],
    props: {
      'schema:name': ['Calpis Highball'],
      'lh:price': [320],
      'lh:currency': ['THB'],
      'schema:description': [
        'Suntory Kakubin Japanese Whiskey, Calpis Lacto, Soda\n\nTASTE: Creamy and refreshing with sweet-tangy Calpis, smooth Kakubin whisky, and a crisp sparkling finish.',
      ],
      'lh:menuSection': ['Drinks — Highballs'],
    },
  },
  {
    id: 'https://app.papaya.co.th/fuego/fuego/menu#01HAP2VXCD1BRYP0Z6857XM4DS',
    types: ['schema:MenuItem'],
    props: {
      'schema:name': ['Red Wine Sangria (glass)'],
      'lh:price': [420],
      'lh:currency': ['THB'],
      'lh:menuSection': ['Drinks — Sangria'],
    },
  },
  {
    id: 'https://app.papaya.co.th/fuego/fuego/menu#01K88CC5D5C7ATN81YVTRBWDM9',
    types: ['schema:MenuItem'],
    props: {
      'schema:name': ['Brisa Roja'],
      'lh:price': [280],
      'lh:currency': ['THB'],
      'schema:description': [
        "Piquillo Cordial, Schweppes Tonic\n\nTASTE: Refreshing with sweet-tangy piquillo pepper notes, balanced by tonic's gentle bitterness and a crisp finish.",
      ],
      'lh:menuSection': ['Drinks — Mocktails'],
    },
  },
];
