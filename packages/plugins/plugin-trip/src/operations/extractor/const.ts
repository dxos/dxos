//
// Copyright 2026 DXOS.org
//

// TODO(burdon): Minimal seed data. Replace with a comprehensive IATA dataset (airlines +
//   airports) — likely a generated lookup or an airport-data service — as coverage grows.

export type Airline = {
  code: string;
  name: string;
  domain: string;
};

/** IATA airline prefix → display name. Extend as needed; falls back to the sender domain. */
export const AIRLINES: Airline[] = [
  { code: 'AA', name: 'American Airlines', domain: 'aa.com' },
  { code: 'AC', name: 'Air Canada', domain: 'aircanada.com' },
  { code: 'AF', name: 'Air France', domain: 'airfrance.com' },
  { code: 'AI', name: 'Air India', domain: 'airindia.com' },
  { code: 'AS', name: 'Alaska Airlines', domain: 'alaskaair.com' },
  { code: 'AY', name: 'Finnair', domain: 'finnair.com' },
  { code: 'AZ', name: 'ITA Airways', domain: 'ita-airways.com' },
  { code: 'B6', name: 'JetBlue Airways', domain: 'jetblue.com' },
  { code: 'BA', name: 'British Airways', domain: 'britishairways.com' },
  { code: 'CA', name: 'Air China', domain: 'airchina.com' },
  { code: 'CX', name: 'Cathay Pacific', domain: 'cathaypacific.com' },
  { code: 'CZ', name: 'China Southern Airlines', domain: 'csair.com' },
  { code: 'DL', name: 'Delta Air Lines', domain: 'delta.com' },
  { code: 'EK', name: 'Emirates', domain: 'emirates.com' },
  { code: 'EY', name: 'Etihad Airways', domain: 'etihad.com' },
  { code: 'FR', name: 'Ryanair', domain: 'ryanair.com' },
  { code: 'IB', name: 'Iberia', domain: 'iberia.com' },
  { code: 'JL', name: 'Japan Airlines', domain: 'jal.com' },
  { code: 'KE', name: 'Korean Air', domain: 'koreanair.com' },
  { code: 'KL', name: 'KLM', domain: 'klm.com' },
  { code: 'LH', name: 'Lufthansa', domain: 'lufthansa.com' },
  { code: 'LX', name: 'Swiss International Air Lines', domain: 'swiss.com' },
  { code: 'MU', name: 'China Eastern Airlines', domain: 'ceair.com' },
  { code: 'NH', name: 'All Nippon Airways', domain: 'ana.co.jp' },
  { code: 'OS', name: 'Austrian Airlines', domain: 'austrian.com' },
  { code: 'QF', name: 'Qantas', domain: 'qantas.com' },
  { code: 'QR', name: 'Qatar Airways', domain: 'qatarairways.com' },
  { code: 'SQ', name: 'Singapore Airlines', domain: 'singaporeair.com' },
  { code: 'TK', name: 'Turkish Airlines', domain: 'turkishairlines.com' },
  { code: 'TP', name: 'TAP Air Portugal', domain: 'flytap.com' },
  { code: 'UA', name: 'United Airlines', domain: 'united.com' },
  { code: 'VS', name: 'Virgin Atlantic', domain: 'virginatlantic.com' },
  { code: 'WN', name: 'Southwest Airlines', domain: 'southwest.com' },
  { code: 'WY', name: 'Oman Air', domain: 'omanair.com' },
];

export type Airport = {
  iata: string;
  name: string;
  geo: {
    lat: number;
    lng: number;
  };
};

export const AIRPORTS: Airport[] = [
  // US
  { iata: 'ATL', name: 'Hartsfield–Jackson Atlanta', geo: { lat: 33.6407, lng: -84.4277 } },
  { iata: 'DFW', name: 'Dallas/Fort Worth', geo: { lat: 32.8998, lng: -97.0403 } },
  { iata: 'ORD', name: "Chicago O'Hare", geo: { lat: 41.9742, lng: -87.9073 } },
  { iata: 'DEN', name: 'Denver', geo: { lat: 39.8561, lng: -104.6737 } },
  { iata: 'LAX', name: 'Los Angeles', geo: { lat: 33.9416, lng: -118.4085 } },
  { iata: 'JFK', name: 'John F. Kennedy', geo: { lat: 40.6413, lng: -73.7781 } },
  { iata: 'MCO', name: 'Orlando', geo: { lat: 28.4312, lng: -81.3081 } },
  { iata: 'MIA', name: 'Miami', geo: { lat: 25.7959, lng: -80.287 } },
  { iata: 'LAS', name: 'Harry Reid (Las Vegas)', geo: { lat: 36.084, lng: -115.1537 } },
  { iata: 'SFO', name: 'San Francisco', geo: { lat: 37.6213, lng: -122.379 } },
  { iata: 'CLT', name: 'Charlotte Douglas', geo: { lat: 35.2144, lng: -80.9473 } },
  { iata: 'SEA', name: 'Seattle-Tacoma', geo: { lat: 47.4502, lng: -122.3088 } },
  { iata: 'PHX', name: 'Phoenix Sky Harbor', geo: { lat: 33.4342, lng: -112.0116 } },
  { iata: 'EWR', name: 'Newark Liberty', geo: { lat: 40.6895, lng: -74.1745 } },
  { iata: 'IAH', name: 'Houston Intercontinental', geo: { lat: 29.9902, lng: -95.3368 } },
  { iata: 'BOS', name: 'Boston Logan', geo: { lat: 42.3656, lng: -71.0096 } },
  { iata: 'MSP', name: 'Minneapolis–Saint Paul', geo: { lat: 44.8848, lng: -93.2223 } },
  { iata: 'LGA', name: 'LaGuardia', geo: { lat: 40.7769, lng: -73.874 } },
  { iata: 'DTW', name: 'Detroit Metro', geo: { lat: 42.2162, lng: -83.3554 } },
  { iata: 'PHL', name: 'Philadelphia', geo: { lat: 39.8744, lng: -75.2424 } },
  { iata: 'FLL', name: 'Fort Lauderdale', geo: { lat: 26.0726, lng: -80.1527 } },
  { iata: 'BWI', name: 'Baltimore/Washington', geo: { lat: 39.1754, lng: -76.6684 } },
  { iata: 'SLC', name: 'Salt Lake City', geo: { lat: 40.7899, lng: -111.9791 } },
  { iata: 'DCA', name: 'Reagan National', geo: { lat: 38.8512, lng: -77.0402 } },
  { iata: 'SAN', name: 'San Diego', geo: { lat: 32.7338, lng: -117.1933 } },

  // Europe
  { iata: 'LHR', name: 'London Heathrow', geo: { lat: 51.47, lng: -0.4543 } },
  { iata: 'IST', name: 'Istanbul', geo: { lat: 41.2753, lng: 28.7519 } },
  { iata: 'CDG', name: 'Paris Charles de Gaulle', geo: { lat: 49.0097, lng: 2.5479 } },
  { iata: 'AMS', name: 'Amsterdam Schiphol', geo: { lat: 52.3105, lng: 4.7683 } },
  { iata: 'FRA', name: 'Frankfurt', geo: { lat: 50.0379, lng: 8.5622 } },
  { iata: 'MAD', name: 'Madrid Barajas', geo: { lat: 40.4983, lng: -3.5676 } },
  { iata: 'BCN', name: 'Barcelona El Prat', geo: { lat: 41.2974, lng: 2.0833 } },
  { iata: 'FCO', name: 'Rome Fiumicino', geo: { lat: 41.8003, lng: 12.2389 } },
  { iata: 'MUC', name: 'Munich', geo: { lat: 48.3538, lng: 11.7861 } },
  { iata: 'LGW', name: 'London Gatwick', geo: { lat: 51.1537, lng: -0.1821 } },
  { iata: 'ZRH', name: 'Zurich', geo: { lat: 47.4581, lng: 8.5555 } },
  { iata: 'CPH', name: 'Copenhagen', geo: { lat: 55.6181, lng: 12.656 } },
  { iata: 'VIE', name: 'Vienna', geo: { lat: 48.1103, lng: 16.5697 } },
  { iata: 'DUB', name: 'Dublin', geo: { lat: 53.4213, lng: -6.2701 } },
  { iata: 'OSL', name: 'Oslo Gardermoen', geo: { lat: 60.1939, lng: 11.1004 } },
  { iata: 'ARN', name: 'Stockholm Arlanda', geo: { lat: 59.6519, lng: 17.9186 } },
  { iata: 'HEL', name: 'Helsinki', geo: { lat: 60.3172, lng: 24.9633 } },
  { iata: 'BRU', name: 'Brussels', geo: { lat: 50.901, lng: 4.4844 } },
  { iata: 'LIS', name: 'Lisbon', geo: { lat: 38.7742, lng: -9.1342 } },
  { iata: 'ATH', name: 'Athens', geo: { lat: 37.9364, lng: 23.9445 } },
  { iata: 'WAW', name: 'Warsaw Chopin', geo: { lat: 52.1657, lng: 20.9671 } },
  { iata: 'MAN', name: 'Manchester', geo: { lat: 53.365, lng: -2.2728 } },
  { iata: 'EDI', name: 'Edinburgh', geo: { lat: 55.95, lng: -3.3725 } },
  { iata: 'PRG', name: 'Prague', geo: { lat: 50.1008, lng: 14.26 } },
  { iata: 'BER', name: 'Berlin Brandenburg', geo: { lat: 52.3667, lng: 13.5033 } },

  // Asia
  { iata: 'HND', name: 'Tokyo Haneda', geo: { lat: 35.5494, lng: 139.7798 } },
  { iata: 'PVG', name: 'Shanghai Pudong', geo: { lat: 31.1443, lng: 121.8083 } },
  { iata: 'CAN', name: 'Guangzhou Baiyun', geo: { lat: 23.3924, lng: 113.2988 } },
  { iata: 'PEK', name: 'Beijing Capital', geo: { lat: 40.0801, lng: 116.5846 } },
  { iata: 'PKX', name: 'Beijing Daxing', geo: { lat: 39.5098, lng: 116.4105 } },
  { iata: 'ICN', name: 'Seoul Incheon', geo: { lat: 37.4602, lng: 126.4407 } },
  { iata: 'SIN', name: 'Singapore Changi', geo: { lat: 1.3644, lng: 103.9915 } },
  { iata: 'HKG', name: 'Hong Kong', geo: { lat: 22.308, lng: 113.9185 } },
  { iata: 'DEL', name: 'Delhi', geo: { lat: 28.5562, lng: 77.1 } },
  { iata: 'BOM', name: 'Mumbai', geo: { lat: 19.0896, lng: 72.8656 } },
  { iata: 'BLR', name: 'Bengaluru', geo: { lat: 13.1986, lng: 77.7066 } },
  { iata: 'KUL', name: 'Kuala Lumpur', geo: { lat: 2.7456, lng: 101.7072 } },
  { iata: 'BKK', name: 'Bangkok Suvarnabhumi', geo: { lat: 13.69, lng: 100.7501 } },
  { iata: 'CGK', name: 'Jakarta Soekarno–Hatta', geo: { lat: -6.1256, lng: 106.6559 } },
  { iata: 'MNL', name: 'Manila', geo: { lat: 14.5086, lng: 121.0198 } },
  { iata: 'TPE', name: 'Taipei Taoyuan', geo: { lat: 25.0797, lng: 121.2342 } },
  { iata: 'NRT', name: 'Tokyo Narita', geo: { lat: 35.7719, lng: 140.3929 } },
  { iata: 'SHA', name: 'Shanghai Hongqiao', geo: { lat: 31.1979, lng: 121.3363 } },
  { iata: 'SZX', name: "Shenzhen Bao'an", geo: { lat: 22.6393, lng: 113.8107 } },
  { iata: 'CTU', name: 'Chengdu Tianfu', geo: { lat: 30.3125, lng: 104.4417 } },
  { iata: 'XIY', name: "Xi'an Xianyang", geo: { lat: 34.4471, lng: 108.7516 } },
  { iata: 'DOH', name: 'Doha Hamad', geo: { lat: 25.2731, lng: 51.6081 } },
  { iata: 'DXB', name: 'Dubai International', geo: { lat: 25.2532, lng: 55.3657 } },
  { iata: 'AUH', name: 'Abu Dhabi', geo: { lat: 24.433, lng: 54.6511 } },
  { iata: 'RUH', name: 'Riyadh King Khalid', geo: { lat: 24.9576, lng: 46.6988 } },

  // ROW
  { iata: 'SYD', name: 'Sydney', geo: { lat: -33.9399, lng: 151.1753 } },
  { iata: 'MEL', name: 'Melbourne', geo: { lat: -37.669, lng: 144.841 } },
  { iata: 'AKL', name: 'Auckland', geo: { lat: -37.0082, lng: 174.785 } },
  { iata: 'BNE', name: 'Brisbane', geo: { lat: -27.3842, lng: 153.1175 } },
  { iata: 'PER', name: 'Perth', geo: { lat: -31.9403, lng: 115.9672 } },
  { iata: 'JNB', name: 'Johannesburg OR Tambo', geo: { lat: -26.1337, lng: 28.242 } },
  { iata: 'CPT', name: 'Cape Town', geo: { lat: -33.9696, lng: 18.5972 } },
  { iata: 'CAI', name: 'Cairo', geo: { lat: 30.1219, lng: 31.4056 } },
  { iata: 'CMN', name: 'Casablanca Mohammed V', geo: { lat: 33.3675, lng: -7.5899 } },
  { iata: 'NBO', name: 'Nairobi Jomo Kenyatta', geo: { lat: -1.3192, lng: 36.9278 } },
  { iata: 'GRU', name: 'São Paulo Guarulhos', geo: { lat: -23.4356, lng: -46.4731 } },
  { iata: 'MEX', name: 'Mexico City', geo: { lat: 19.4361, lng: -99.0719 } },
  { iata: 'YYZ', name: 'Toronto Pearson', geo: { lat: 43.6777, lng: -79.6248 } },
  { iata: 'YVR', name: 'Vancouver', geo: { lat: 49.1967, lng: -123.1815 } },
  { iata: 'BOG', name: 'Bogotá El Dorado', geo: { lat: 4.7016, lng: -74.1469 } },
  { iata: 'SCL', name: 'Santiago', geo: { lat: -33.393, lng: -70.7858 } },
  { iata: 'LIM', name: 'Lima Jorge Chávez', geo: { lat: -12.0219, lng: -77.1143 } },
  { iata: 'EZE', name: 'Buenos Aires Ezeiza', geo: { lat: -34.8222, lng: -58.5358 } },
  { iata: 'PTY', name: 'Panama City Tocumen', geo: { lat: 9.0714, lng: -79.3835 } },
  { iata: 'CUN', name: 'Cancún', geo: { lat: 21.0365, lng: -86.8771 } },
  { iata: 'GIG', name: 'Rio de Janeiro Galeão', geo: { lat: -22.809, lng: -43.2506 } },
  { iata: 'BSB', name: 'Brasília', geo: { lat: -15.8697, lng: -47.9208 } },
  { iata: 'YUL', name: 'Montréal Trudeau', geo: { lat: 45.4706, lng: -73.7408 } },
  { iata: 'SJO', name: 'San José (Costa Rica)', geo: { lat: 9.9939, lng: -84.2088 } },
  { iata: 'UIO', name: 'Quito', geo: { lat: -0.1292, lng: -78.3575 } },
];
