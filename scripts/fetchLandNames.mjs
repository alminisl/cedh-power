// Fetches all land card names from Scryfall bulk data and writes to src/data/landNames.json

const BULK_DATA_URL = "https://api.scryfall.com/bulk-data";

async function main() {
  console.log("Fetching bulk data index...");
  const bulkRes = await fetch(BULK_DATA_URL);
  const bulk = await bulkRes.json();

  const oracleEntry = bulk.data.find((d) => d.type === "oracle_cards");
  if (!oracleEntry) throw new Error("Could not find oracle_cards bulk data");

  console.log(`Downloading oracle cards from ${oracleEntry.download_uri}...`);
  const cardsRes = await fetch(oracleEntry.download_uri);
  const cards = await cardsRes.json();

  console.log(`Processing ${cards.length} cards...`);

  const landNames = new Set();

  for (const card of cards) {
    // Skip tokens and other non-playable cards
    if (card.layout === "token" || card.layout === "art_series") continue;

    // For double-faced cards, only check the front face
    if (card.card_faces && card.card_faces.length > 0) {
      const frontType = card.card_faces[0].type_line || "";
      if (frontType.includes("Land")) {
        landNames.add(card.name);
      }
    } else if (card.type_line && card.type_line.includes("Land")) {
      landNames.add(card.name);
    }
  }

  const sorted = [...landNames].sort();
  const outPath = new URL("../src/data/landNames.json", import.meta.url);
  const { writeFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  writeFileSync(fileURLToPath(outPath), JSON.stringify(sorted, null, 2) + "\n");

  console.log(`Written ${sorted.length} land names to src/data/landNames.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
