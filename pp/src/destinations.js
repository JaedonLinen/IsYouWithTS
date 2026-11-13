// The two trip options, in the order they appear on the destination screen
export const DESTINATIONS = [
  {
    id: 'miami',
    word: 'MIAMI',
    label: 'Miami',
    short: 'Miami',
    // rough per-person trip cost; `max` items are an upper limit
    estimate: [
      { label: 'Airbnb', amount: 400 },
      { label: 'Flight', amount: 200 },
      { label: 'Car', amount: 100 },
      { label: 'Grocery/liq', amount: 70 },
      { label: 'Extra activities', amount: 500, max: true },
    ],
  },
  {
    id: 'orlando-tampa',
    word: 'ORLANDO/TAMPA',
    label: 'Orlando or Tampa',
    short: 'Orlando/Tampa',
    estimate: [
      { label: 'Airbnb', amount: 300 },
      { label: 'Gas', amount: 80 },
      { label: 'Grocery/liq', amount: 100 },
      { label: 'Extra activities', amount: 300, max: true },
    ],
  },
]

export function estimateTotal(destination) {
  return destination.estimate.reduce((sum, item) => sum + item.amount, 0)
}
