// Listing photos live in src/assets/bnb/<BNBID>/01.jpeg, 02.png, ...
// Vite turns each file into a hashed URL at build time.
const files = import.meta.glob('./assets/bnb/*/*.{jpeg,jpg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
})

const byId = {}
Object.keys(files)
  .sort()
  .forEach((path) => {
    const id = path.split('/')[3]
    ;(byId[id] ??= []).push(files[path])
  })

export function imagesFor(id) {
  return byId[id] ?? []
}
