//
// Copyright 2026 DXOS.org
//

import { LatLngLiteral } from '@dxos/react-ui-geo';

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
  location: LatLngLiteral;
};

export const AIRPORTS: Airport[] = [
  // US
  { iata: 'ATL', name: 'Hartsfield–Jackson Atlanta', location: { lat: 33.6407, lng: -84.4277 } },
  { iata: 'DFW', name: 'Dallas/Fort Worth', location: { lat: 32.8998, lng: -97.0403 } },
  { iata: 'ORD', name: "Chicago O'Hare", location: { lat: 41.9742, lng: -87.9073 } },
  { iata: 'DEN', name: 'Denver', location: { lat: 39.8561, lng: -104.6737 } },
  { iata: 'LAX', name: 'Los Angeles', location: { lat: 33.9416, lng: -118.4085 } },
  { iata: 'JFK', name: 'John F. Kennedy', location: { lat: 40.6413, lng: -73.7781 } },
  { iata: 'MCO', name: 'Orlando', location: { lat: 28.4312, lng: -81.3081 } },
  { iata: 'MIA', name: 'Miami', location: { lat: 25.7959, lng: -80.287 } },
  { iata: 'LAS', name: 'Harry Reid (Las Vegas)', location: { lat: 36.084, lng: -115.1537 } },
  { iata: 'SFO', name: 'San Francisco', location: { lat: 37.6213, lng: -122.379 } },
  { iata: 'CLT', name: 'Charlotte Douglas', location: { lat: 35.2144, lng: -80.9473 } },
  { iata: 'SEA', name: 'Seattle-Tacoma', location: { lat: 47.4502, lng: -122.3088 } },
  { iata: 'PHX', name: 'Phoenix Sky Harbor', location: { lat: 33.4342, lng: -112.0116 } },
  { iata: 'EWR', name: 'Newark Liberty', location: { lat: 40.6895, lng: -74.1745 } },
  { iata: 'IAH', name: 'Houston Intercontinental', location: { lat: 29.9902, lng: -95.3368 } },
  { iata: 'BOS', name: 'Boston Logan', location: { lat: 42.3656, lng: -71.0096 } },
  { iata: 'MSP', name: 'Minneapolis–Saint Paul', location: { lat: 44.8848, lng: -93.2223 } },
  { iata: 'LGA', name: 'LaGuardia', location: { lat: 40.7769, lng: -73.874 } },
  { iata: 'DTW', name: 'Detroit Metro', location: { lat: 42.2162, lng: -83.3554 } },
  { iata: 'PHL', name: 'Philadelphia', location: { lat: 39.8744, lng: -75.2424 } },
  { iata: 'FLL', name: 'Fort Lauderdale', location: { lat: 26.0726, lng: -80.1527 } },
  { iata: 'BWI', name: 'Baltimore/Washington', location: { lat: 39.1754, lng: -76.6684 } },
  { iata: 'SLC', name: 'Salt Lake City', location: { lat: 40.7899, lng: -111.9791 } },
  { iata: 'DCA', name: 'Reagan National', location: { lat: 38.8512, lng: -77.0402 } },
  { iata: 'SAN', name: 'San Diego', location: { lat: 32.7338, lng: -117.1933 } },

  // Europe
  { iata: 'LHR', name: 'London Heathrow', location: { lat: 51.47, lng: -0.4543 } },
  { iata: 'IST', name: 'Istanbul', location: { lat: 41.2753, lng: 28.7519 } },
  { iata: 'CDG', name: 'Paris Charles de Gaulle', location: { lat: 49.0097, lng: 2.5479 } },
  { iata: 'AMS', name: 'Amsterdam Schiphol', location: { lat: 52.3105, lng: 4.7683 } },
  { iata: 'FRA', name: 'Frankfurt', location: { lat: 50.0379, lng: 8.5622 } },
  { iata: 'MAD', name: 'Madrid Barajas', location: { lat: 40.4983, lng: -3.5676 } },
  { iata: 'BCN', name: 'Barcelona El Prat', location: { lat: 41.2974, lng: 2.0833 } },
  { iata: 'FCO', name: 'Rome Fiumicino', location: { lat: 41.8003, lng: 12.2389 } },
  { iata: 'MUC', name: 'Munich', location: { lat: 48.3538, lng: 11.7861 } },
  { iata: 'LGW', name: 'London Gatwick', location: { lat: 51.1537, lng: -0.1821 } },
  { iata: 'ZRH', name: 'Zurich', location: { lat: 47.4581, lng: 8.5555 } },
  { iata: 'CPH', name: 'Copenhagen', location: { lat: 55.6181, lng: 12.656 } },
  { iata: 'VIE', name: 'Vienna', location: { lat: 48.1103, lng: 16.5697 } },
  { iata: 'DUB', name: 'Dublin', location: { lat: 53.4213, lng: -6.2701 } },
  { iata: 'OSL', name: 'Oslo Gardermoen', location: { lat: 60.1939, lng: 11.1004 } },
  { iata: 'ARN', name: 'Stockholm Arlanda', location: { lat: 59.6519, lng: 17.9186 } },
  { iata: 'HEL', name: 'Helsinki', location: { lat: 60.3172, lng: 24.9633 } },
  { iata: 'BRU', name: 'Brussels', location: { lat: 50.901, lng: 4.4844 } },
  { iata: 'LIS', name: 'Lisbon', location: { lat: 38.7742, lng: -9.1342 } },
  { iata: 'ATH', name: 'Athens', location: { lat: 37.9364, lng: 23.9445 } },
  { iata: 'WAW', name: 'Warsaw Chopin', location: { lat: 52.1657, lng: 20.9671 } },
  { iata: 'MAN', name: 'Manchester', location: { lat: 53.365, lng: -2.2728 } },
  { iata: 'EDI', name: 'Edinburgh', location: { lat: 55.95, lng: -3.3725 } },
  { iata: 'PRG', name: 'Prague', location: { lat: 50.1008, lng: 14.26 } },
  { iata: 'BER', name: 'Berlin Brandenburg', location: { lat: 52.3667, lng: 13.5033 } },

  // Asia
  { iata: 'HND', name: 'Tokyo Haneda', location: { lat: 35.5494, lng: 139.7798 } },
  { iata: 'PVG', name: 'Shanghai Pudong', location: { lat: 31.1443, lng: 121.8083 } },
  { iata: 'CAN', name: 'Guangzhou Baiyun', location: { lat: 23.3924, lng: 113.2988 } },
  { iata: 'PEK', name: 'Beijing Capital', location: { lat: 40.0801, lng: 116.5846 } },
  { iata: 'PKX', name: 'Beijing Daxing', location: { lat: 39.5098, lng: 116.4105 } },
  { iata: 'ICN', name: 'Seoul Incheon', location: { lat: 37.4602, lng: 126.4407 } },
  { iata: 'SIN', name: 'Singapore Changi', location: { lat: 1.3644, lng: 103.9915 } },
  { iata: 'HKG', name: 'Hong Kong', location: { lat: 22.308, lng: 113.9185 } },
  { iata: 'DEL', name: 'Delhi', location: { lat: 28.5562, lng: 77.1 } },
  { iata: 'BOM', name: 'Mumbai', location: { lat: 19.0896, lng: 72.8656 } },
  { iata: 'BLR', name: 'Bengaluru', location: { lat: 13.1986, lng: 77.7066 } },
  { iata: 'KUL', name: 'Kuala Lumpur', location: { lat: 2.7456, lng: 101.7072 } },
  { iata: 'BKK', name: 'Bangkok Suvarnabhumi', location: { lat: 13.69, lng: 100.7501 } },
  { iata: 'CGK', name: 'Jakarta Soekarno–Hatta', location: { lat: -6.1256, lng: 106.6559 } },
  { iata: 'MNL', name: 'Manila', location: { lat: 14.5086, lng: 121.0198 } },
  { iata: 'TPE', name: 'Taipei Taoyuan', location: { lat: 25.0797, lng: 121.2342 } },
  { iata: 'NRT', name: 'Tokyo Narita', location: { lat: 35.7719, lng: 140.3929 } },
  { iata: 'SHA', name: 'Shanghai Hongqiao', location: { lat: 31.1979, lng: 121.3363 } },
  { iata: 'SZX', name: "Shenzhen Bao'an", location: { lat: 22.6393, lng: 113.8107 } },
  { iata: 'CTU', name: 'Chengdu Tianfu', location: { lat: 30.3125, lng: 104.4417 } },
  { iata: 'XIY', name: "Xi'an Xianyang", location: { lat: 34.4471, lng: 108.7516 } },
  { iata: 'DOH', name: 'Doha Hamad', location: { lat: 25.2731, lng: 51.6081 } },
  { iata: 'DXB', name: 'Dubai International', location: { lat: 25.2532, lng: 55.3657 } },
  { iata: 'AUH', name: 'Abu Dhabi', location: { lat: 24.433, lng: 54.6511 } },
  { iata: 'RUH', name: 'Riyadh King Khalid', location: { lat: 24.9576, lng: 46.6988 } },

  // ROW
  { iata: 'SYD', name: 'Sydney', location: { lat: -33.9399, lng: 151.1753 } },
  { iata: 'MEL', name: 'Melbourne', location: { lat: -37.669, lng: 144.841 } },
  { iata: 'AKL', name: 'Auckland', location: { lat: -37.0082, lng: 174.785 } },
  { iata: 'BNE', name: 'Brisbane', location: { lat: -27.3842, lng: 153.1175 } },
  { iata: 'PER', name: 'Perth', location: { lat: -31.9403, lng: 115.9672 } },
  { iata: 'JNB', name: 'Johannesburg OR Tambo', location: { lat: -26.1337, lng: 28.242 } },
  { iata: 'CPT', name: 'Cape Town', location: { lat: -33.9696, lng: 18.5972 } },
  { iata: 'CAI', name: 'Cairo', location: { lat: 30.1219, lng: 31.4056 } },
  { iata: 'CMN', name: 'Casablanca Mohammed V', location: { lat: 33.3675, lng: -7.5899 } },
  { iata: 'NBO', name: 'Nairobi Jomo Kenyatta', location: { lat: -1.3192, lng: 36.9278 } },
  { iata: 'GRU', name: 'São Paulo Guarulhos', location: { lat: -23.4356, lng: -46.4731 } },
  { iata: 'MEX', name: 'Mexico City', location: { lat: 19.4361, lng: -99.0719 } },
  { iata: 'YYZ', name: 'Toronto Pearson', location: { lat: 43.6777, lng: -79.6248 } },
  { iata: 'YVR', name: 'Vancouver', location: { lat: 49.1967, lng: -123.1815 } },
  { iata: 'BOG', name: 'Bogotá El Dorado', location: { lat: 4.7016, lng: -74.1469 } },
  { iata: 'SCL', name: 'Santiago', location: { lat: -33.393, lng: -70.7858 } },
  { iata: 'LIM', name: 'Lima Jorge Chávez', location: { lat: -12.0219, lng: -77.1143 } },
  { iata: 'EZE', name: 'Buenos Aires Ezeiza', location: { lat: -34.8222, lng: -58.5358 } },
  { iata: 'PTY', name: 'Panama City Tocumen', location: { lat: 9.0714, lng: -79.3835 } },
  { iata: 'CUN', name: 'Cancún', location: { lat: 21.0365, lng: -86.8771 } },
  { iata: 'GIG', name: 'Rio de Janeiro Galeão', location: { lat: -22.809, lng: -43.2506 } },
  { iata: 'BSB', name: 'Brasília', location: { lat: -15.8697, lng: -47.9208 } },
  { iata: 'YUL', name: 'Montréal Trudeau', location: { lat: 45.4706, lng: -73.7408 } },
  { iata: 'SJO', name: 'San José (Costa Rica)', location: { lat: 9.9939, lng: -84.2088 } },
  { iata: 'UIO', name: 'Quito', location: { lat: -0.1292, lng: -78.3575 } },
];
