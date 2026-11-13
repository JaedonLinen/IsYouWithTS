// Google Apps Script web app for the "pp spreadsheet" (source: sheetapi.txt).
//   GET  -> every row of the "Airbnb Opts" tab
//   POST -> adds a row to the "Form" tab (Name, M, OT, MBNB1, MBNB2, OTBNB1, OTBNB2, DT)
export const SHEET_API_URL =
  'https://script.google.com/macros/s/AKfycbwMMfpz74CY2YDCnMozufS6XIlVb0LXgM2z-4GJLdHXqJEqTr_A2Cb0NuHr4KwtjGT_/exec'

// Which values in the sheet's City column belong to each destination
const CITY_VALUES = {
  miami: ['miami'],
  'orlando-tampa': ['orlando', 'tampa', 'orlando/tampa'],
}

// Sheet header -> field name. Headers are matched case-insensitively.
const COLUMNS = {
  id: 'BNBID',
  name: 'Name',
  city: 'City',
  cost: 'Cost',
  perPerson: 'Cost divided by 8',
  bedrooms: 'Bedrooms',
  singleBedrooms: 'Single Bedrooms',
  beds: 'Beds',
  baths: 'Bath',
  rating: 'rating',
  reviewCount: 'review_count',
  minsCity: 'Mins from city',
  minsBeach: 'Mins for beach',
  link: 'Link',
}

function pick(row, header) {
  const want = header.toLowerCase()
  const key = Object.keys(row).find((k) => k.trim().toLowerCase() === want)
  const value = key === undefined ? '' : row[key]
  return value === '' || value === null ? null : value
}

function toNumber(value) {
  if (value === null) return null
  const n = Number(String(value).replace(/[$,\s]/g, ''))
  return Number.isFinite(n) ? n : null
}

function normalize(row) {
  const get = (field) => pick(row, COLUMNS[field])
  const city = String(get('city') ?? '').trim()
  const destination = Object.keys(CITY_VALUES).find((d) =>
    CITY_VALUES[d].includes(city.toLowerCase()),
  )

  return {
    id: String(get('id') ?? '').trim(),
    name: String(get('name') ?? '').trim(),
    city,
    destination: destination ?? null,
    cost: toNumber(get('cost')),
    perPerson: toNumber(get('perPerson')),
    bedrooms: toNumber(get('bedrooms')),
    singleBedrooms: toNumber(get('singleBedrooms')),
    beds: toNumber(get('beds')),
    baths: toNumber(get('baths')),
    rating: toNumber(get('rating')),
    reviewCount: toNumber(get('reviewCount')),
    minsCity: toNumber(get('minsCity')),
    minsBeach: toNumber(get('minsBeach')),
    link: get('link'),
  }
}

let listingsPromise = null

// Fetched once per page load and shared by both city screens.
export function fetchListings() {
  if (!listingsPromise) {
    listingsPromise = fetch(SHEET_API_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`The sheet answered with ${res.status}.`)
        return res.json()
      })
      .then((data) => {
        if (!data.ok) throw new Error(data.error || 'The sheet returned an error.')
        return data.rows.map(normalize).filter((l) => l.id && l.name)
      })
      .catch((err) => {
        listingsPromise = null // let a retry fetch again
        throw err
      })
  }
  return listingsPromise
}

function today() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Listing IDs are 19 digits; as plain numbers Sheets would round them
// (1.46102E+18). The leading apostrophe makes Sheets keep them as text.
const asText = (id) => (id ? `'${id}` : '')

// selections: { miami?: [id, id], 'orlando-tampa'?: [id, id] }
export function buildSubmission(name, selections) {
  const miami = selections.miami ?? []
  const ot = selections['orlando-tampa'] ?? []
  return {
    Name: name,
    M: miami.length ? 'Y' : 'N',
    OT: ot.length ? 'Y' : 'N',
    MBNB1: asText(miami[0]),
    MBNB2: asText(miami[1]),
    OTBNB1: asText(ot[0]),
    OTBNB2: asText(ot[1]),
    DT: today(),
  }
}

export async function submitSelections(row) {
  // text/plain keeps this a "simple" CORS request; Apps Script can't answer
  // a preflight, and the script parses the body as JSON either way.
  const res = await fetch(SHEET_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(row),
  })
  if (!res.ok) throw new Error(`The sheet answered with ${res.status}.`)
  const data = await res.json()
  if (!data.ok) throw new Error(data.error || 'The sheet did not save the row.')
  // The row is saved by now, so don't fail (a retry would duplicate it), but
  // make a renamed column easy to spot: the script drops keys it can't match.
  if (data.ignored?.length) {
    console.error(`Form tab has no column for: ${data.ignored.join(', ')}`)
  }
  return data
}
