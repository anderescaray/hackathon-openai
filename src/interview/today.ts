const BARCELONA_TIME_ZONE = "Europe/Madrid";
// Swedish dates are written YYYY-MM-DD, the format the contract uses.
const ISO_DATE_LOCALE = "sv-SE";

export function formatBarcelonaDate(date: Date): string {
  return date.toLocaleDateString(ISO_DATE_LOCALE, { timeZone: BARCELONA_TIME_ZONE });
}
