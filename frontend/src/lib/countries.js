// [ISO code, name]. "XX" = a country outside Africa that is not in the list.
export const AFRICAN_COUNTRIES = [
  ['DZ', 'Algeria'], ['AO', 'Angola'], ['BJ', 'Benin'], ['BW', 'Botswana'], ['BF', 'Burkina Faso'],
  ['BI', 'Burundi'], ['CV', 'Cabo Verde'], ['CM', 'Cameroon'], ['CF', 'Central African Republic'], ['TD', 'Chad'],
  ['KM', 'Comoros'], ['CG', 'Congo'], ['CD', 'DR Congo'], ['CI', "Côte d'Ivoire"], ['DJ', 'Djibouti'],
  ['EG', 'Egypt'], ['GQ', 'Equatorial Guinea'], ['ER', 'Eritrea'], ['SZ', 'Eswatini'], ['ET', 'Ethiopia'],
  ['GA', 'Gabon'], ['GM', 'Gambia'], ['GH', 'Ghana'], ['GN', 'Guinea'], ['GW', 'Guinea-Bissau'],
  ['KE', 'Kenya'], ['LS', 'Lesotho'], ['LR', 'Liberia'], ['LY', 'Libya'], ['MG', 'Madagascar'],
  ['MW', 'Malawi'], ['ML', 'Mali'], ['MR', 'Mauritania'], ['MU', 'Mauritius'], ['MA', 'Morocco'],
  ['MZ', 'Mozambique'], ['NA', 'Namibia'], ['NE', 'Niger'], ['NG', 'Nigeria'], ['RW', 'Rwanda'],
  ['ST', 'São Tomé and Príncipe'], ['SN', 'Senegal'], ['SC', 'Seychelles'], ['SL', 'Sierra Leone'], ['SO', 'Somalia'],
  ['ZA', 'South Africa'], ['SS', 'South Sudan'], ['SD', 'Sudan'], ['TZ', 'Tanzania'], ['TG', 'Togo'],
  ['TN', 'Tunisia'], ['UG', 'Uganda'], ['ZM', 'Zambia'], ['ZW', 'Zimbabwe'],
];

export const OTHER_COUNTRIES = [
  ['US', 'United States'], ['GB', 'United Kingdom'], ['CA', 'Canada'], ['AU', 'Australia'], ['NZ', 'New Zealand'],
  ['DE', 'Germany'], ['FR', 'France'], ['NL', 'Netherlands'], ['BE', 'Belgium'], ['CH', 'Switzerland'],
  ['SE', 'Sweden'], ['NO', 'Norway'], ['DK', 'Denmark'], ['FI', 'Finland'], ['IE', 'Ireland'],
  ['IT', 'Italy'], ['ES', 'Spain'], ['PT', 'Portugal'], ['TR', 'Turkey'], ['SA', 'Saudi Arabia'],
  ['AE', 'United Arab Emirates'], ['IN', 'India'], ['PK', 'Pakistan'], ['BD', 'Bangladesh'], ['CN', 'China'],
  ['JP', 'Japan'], ['KR', 'South Korea'], ['MY', 'Malaysia'], ['SG', 'Singapore'], ['ID', 'Indonesia'],
  ['TH', 'Thailand'], ['BR', 'Brazil'], ['MX', 'Mexico'], ['XX', 'Other country (outside Africa)'],
];

const AFRICAN_CODES = new Set(AFRICAN_COUNTRIES.map(([c]) => c));
const NAMES = Object.fromEntries([...AFRICAN_COUNTRIES, ...OTHER_COUNTRIES]);

export const isAfrican = (code) => AFRICAN_CODES.has((code || '').toUpperCase());
export const countryName = (code) => NAMES[(code || '').toUpperCase()] ?? code ?? '';

/** Mirrors the server: sole | africa | global | unknown */
export function collaborationScope(coAuthors = []) {
  const list = (coAuthors ?? []).filter(Boolean);
  if (!list.length) return 'sole';
  const codes = list.map((a) => (a.country || '').toUpperCase());
  if (codes.some((c) => c && !isAfrican(c))) return 'global';
  if (codes.every((c) => c && isAfrican(c))) return 'africa';
  return 'unknown';
}