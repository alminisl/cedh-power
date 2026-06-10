// Performance verification script
// Verifies the CardTooltip deferred-mount fix:
//   - Tooltip portals are NOT pre-mounted in DOM before any hover
//   - No /api/card-image requests fire until user actually hovers a card
// Also verifies the Cache-Control header on /api/pair-data via direct HTTP.

import { chromium } from '@playwright/test';
import { execSync } from 'child_process';

const DECK_LIST = `1 Thrasios, Triton Hero
1 Tymna the Weaver
1 Sol Ring
1 Mana Crypt
1 Mana Vault
1 Grim Monolith
1 Chrome Mox
1 Mox Diamond
1 Lotus Petal
1 Jeweled Lotus
1 Mox Opal
1 Dark Ritual
1 Cabal Ritual
1 Rite of Flame
1 Pyretic Ritual
1 Desperate Ritual
1 Seething Song
1 Demonic Tutor
1 Vampiric Tutor
1 Imperial Seal
1 Mystical Tutor
1 Enlightened Tutor
1 Worldly Tutor
1 Personal Tutor
1 Lim-Dul's Vault
1 Thassa's Oracle
1 Demonic Consultation
1 Tainted Pact
1 Doomsday
1 Bolas's Citadel
1 Aetherflux Reservoir
1 Brain Freeze
1 Grapeshot
1 Rhystic Study
1 Necropotence
1 Sylvan Library
1 Ad Nauseam
1 Peer into the Abyss
1 Mystic Remora
1 Windfall
1 Wheel of Fortune
1 Brainstorm
1 Ponder
1 Preordain
1 Gitaxian Probe
1 Force of Will
1 Force of Negation
1 Pact of Negation
1 Mana Drain
1 Counterspell
1 Swan Song
1 Flusterstorm
1 Mental Misstep
1 Dispel
1 Spell Pierce
1 Fierce Guardianship
1 Deadly Rollick
1 Deflecting Swat
1 Toxic Deluge
1 Swords to Plowshares
1 Arcane Signet
1 Talisman of Curiosity
1 Talisman of Dominance
1 Talisman of Progress
1 Fellwar Stone
1 Sensei's Divining Top
1 Crop Rotation
1 Nature's Claim
1 Chain of Vapor
1 Noxious Revival
1 Carpet of Flowers
1 Deathrite Shaman
1 Command Tower
1 Mana Confluence
1 City of Brass
1 Gemstone Mine
1 Forbidden Orchard
1 Tarnished Citadel
1 Underground Sea
1 Tropical Island
1 Tundra
1 Bayou
1 Savannah
1 Scrubland
1 Watery Grave
1 Breeding Pool
1 Hallowed Fountain
1 Overgrown Tomb
1 Temple Garden
1 Godless Shrine
1 Flooded Strand
1 Polluted Delta
1 Verdant Catacombs
1 Marsh Flats
1 Misty Rainforest
1 Windswept Heath
1 Island
1 Swamp
1 Plains
1 Forest`;

const results = { passed: 0, failed: 0 };
function check(label, condition, detail) {
  if (condition) {
    console.log(`  ✅ PASS: ${label}${detail ? ' — ' + detail : ''}`);
    results.passed++;
  } else {
    console.log(`  ❌ FAIL: ${label}${detail ? ' — ' + detail : ''}`);
    results.failed++;
  }
}

// ── TEST 0: Cache-Control header (via curl, not browser — avoids double-fetching the 9.6MB file) ──
console.log('TEST 0: Cache-Control header (curl)');
try {
  const headers = execSync('curl -sI http://localhost:3000/api/pair-data', { timeout: 10000 }).toString();
  const ccLine = headers.split('\n').find(l => l.toLowerCase().startsWith('cache-control'));
  const cc = ccLine ? ccLine.split(':').slice(1).join(':').trim() : null;
  console.log(`  Cache-Control: "${cc}"`);
  check(
    'max-age=86400 + stale-while-revalidate',
    cc && cc.includes('max-age=86400') && cc.includes('stale-while-revalidate'),
    cc ?? 'header not found'
  );
} catch (e) {
  console.log(`  ⚠️  SKIP: curl failed — ${e.message}`);
}

// ── Launch browser and intercept /api/pair-data with a minimal mock ──
console.log('\nLaunching headless browser with mocked pair data...');
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();

// Build a minimal pairData with all pairs from the deck so the table renders cards
const deckCards = DECK_LIST
  .split('\n')
  .map(l => l.replace(/^1 /, '').trim())
  .filter(Boolean);

const minimalPairData = {};
for (let i = 0; i < deckCards.length; i++) {
  for (let j = i + 1; j < deckCards.length; j++) {
    const [a, b] = [deckCards[i], deckCards[j]].sort();
    minimalPairData[`${a}|||${b}`] = { p: 5.5, w: 4.0, c: 100, l: 1.1 };
  }
}

// Intercept the pair-data API so the browser doesn't need to hit R2
await page.route('**/api/pair-data', async route => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(minimalPairData),
  });
});

// Intercept scryfall/collection so card type fetch is instant
await page.route('**/api/scryfall/collection', async route => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: [], not_found: [] }),
  });
});

// Track actual card-image requests (should be ZERO before hover)
const cardImageRequests = [];
page.on('request', req => {
  if (req.url().includes('/api/card-image')) {
    cardImageRequests.push(req.url());
  }
});

await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });

// Wait for pair data spinner to go away
await page.waitForSelector('textarea', { timeout: 15000 });
console.log('  App loaded with mocked pair data.');

// ── Analyze the deck ──
console.log('\nAnalyzing deck...');
await page.fill('textarea', DECK_LIST);
cardImageRequests.length = 0;

await page.click('button:has-text("Analyze Deck")');
await page.waitForSelector('tbody tr', { timeout: 10000 });

const rowCount = await page.evaluate(() => document.querySelectorAll('tbody tr').length);
console.log(`  Table rendered with ${rowCount} rows.`);

// Give browser 2s to fire any eager image loads
await page.waitForTimeout(2000);

// ── TEST 1: Portal count before any hover ──
console.log('\nTEST 1: No portals pre-mounted in DOM before hover');
const portalCount = await page.evaluate(() =>
  document.querySelectorAll('.fixed.z-\\[9999\\]').length
);
console.log(`  Portals in DOM: ${portalCount} (rows: ${rowCount})`);
check(`0 portals for ${rowCount} table rows`, portalCount === 0, `got ${portalCount}`);

// ── TEST 2: No card-image requests fired before hover ──
console.log('\nTEST 2: No card-image requests before hover');
console.log(`  /api/card-image requests fired: ${cardImageRequests.length}`);
check('0 card-image requests before hover', cardImageRequests.length === 0, `got ${cardImageRequests.length}`);

// ── TEST 3: Portal appears on hover ──
console.log('\nTEST 3: Portal mounts and shows on hover');
const firstSpan = page.locator('tbody tr:first-child td:nth-child(2) span.cursor-pointer').first();
const cardText = await page.locator('tbody tr:first-child td:nth-child(2)').textContent();
console.log(`  Hovering: "${cardText?.trim()}"`);

await firstSpan.hover();
await page.waitForTimeout(400);

const portalAfterCount = await page.evaluate(() =>
  document.querySelectorAll('.fixed.z-\\[9999\\]').length
);
const tooltipOpacity = await page.evaluate(() => {
  for (const el of document.querySelectorAll('.fixed.z-\\[9999\\]')) {
    if (el.style.opacity === '1') return 1;
  }
  return 0;
});

console.log(`  Portals after hover: ${portalAfterCount}, opacity: ${tooltipOpacity}`);
check('Portal created on first hover', portalAfterCount >= 1, `${portalAfterCount} portals`);
check('Tooltip visible (opacity=1)', tooltipOpacity === 1, `opacity=${tooltipOpacity}`);

// ── TEST 4: Un-hover → hover 2nd card (portal stays, now 2 total) ──
console.log('\nTEST 4: Second hover creates second portal, first stays mounted');
await page.mouse.move(0, 0);
await page.waitForTimeout(200);
const secondSpan = page.locator('tbody tr:nth-child(2) td:nth-child(2) span.cursor-pointer').first();
await secondSpan.hover();
await page.waitForTimeout(400);

const portalFinalCount = await page.evaluate(() =>
  document.querySelectorAll('.fixed.z-\\[9999\\]').length
);
console.log(`  Portals after 2nd hover: ${portalFinalCount}`);
check('Portals accumulate (not remounted each hover)', portalFinalCount >= 2, `${portalFinalCount} portals`);

// ── Summary ──
console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${results.passed} passed, ${results.failed} failed`);
console.log(results.failed === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');

await browser.close();
process.exit(results.failed === 0 ? 0 : 1);
