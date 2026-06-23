import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const FAN_KIT_ITEMS = 'C:/Development/Fan Kit Assets (Shop Titans)/Items';
const ASSET_BASE = 'https://playshoptitans.com/assets/items';
const DOWNLOAD = process.argv.includes('--download');
const SCRAPE = process.argv.includes('--scrape');
const SAVE = process.argv.includes('--save');   // only applies with --scrape

const TYPE_TO_FOLDER = {
  Sword: 'Swords', Axe: 'Axes', Dagger: 'Daggers', Mace: 'Maces',
  Spear: 'Spears', Staff: 'Staves', Wand: 'Wands', Bow: 'Bows',
  Crossbow: 'Crossbows', Gun: 'Guns', Instrument: 'Instruments',
  'Dual Wield': 'Dual Wields', Aurasong: 'Aurasongs', Catalyst: 'Catalysts',
  Spell: 'Spells', Helmet: 'Helmets', 'Magician Hat': 'Magician Hats',
  'Rogue Hat': 'Rogue Hats', 'Light Armor': 'Light Armor', 'Heavy Armor': 'Heavy Armor',
  Clothes: 'Clothes', Gauntlets: 'Gauntlets', Gloves: 'Gloves',
  'Light Footwear': 'Light Footwear', 'Heavy Footwear': 'Heavy Footwear',
  Shield: 'Shields', Ring: 'Rings', Amulet: 'Amulets', Cloak: 'Cloaks', Quiver: 'Quivers',
  Potion: 'Potions', Meal: 'Meals', Dessert: 'Desserts',
  'Herbal Medicine': 'Herbal Medicine', Element: 'Elements', Spirit: 'Spirits',
  Familiar: 'Familiars', Moonstone: 'Moonstones', Runestone: 'Runestones', Idol: 'Idols',
};

const SUBCATEGORY_TO_FOLDER = {
  catalyst: 'Catalysts', bow: 'Bows', instrument: 'Instruments', axe: 'Axes',
  dual_wield: 'Dual Wields', sword: 'Swords', staff: 'Staves', gun: 'Guns',
  crossbow: 'Crossbows', dagger: 'Daggers', mace: 'Maces', spear: 'Spears', wand: 'Wands',
  moonstone: 'Moonstones', runestone: 'Runestones',
  gloves: 'Gloves', light_armor: 'Light Armor', gauntlets: 'Gauntlets', helmet: 'Helmets',
  clothes: 'Clothes', light_footwear: 'Light Footwear', magician_hat: 'Magician Hats',
  heavy_footwear: 'Heavy Footwear', rogue_hat: 'Rogue Hats', heavy_armor: 'Heavy Armor',
  light: 'Elements', earth: 'Elements', water: 'Elements', fire: 'Elements',
  gold: 'Elements', air: 'Elements', dark: 'Elements', spirit: 'Spirits',
  meal: 'Meals', amulet: 'Amulets', dessert: 'Desserts', herbal_medicine: 'Herbal Medicine',
  familiar: 'Familiars', potion: 'Potions', ring: 'Rings', shield: 'Shields',
  cloak: 'Cloaks', idol: 'Idols', spell: 'Spells', aurasong: 'Aurasongs', quiver: 'Quivers',
};

// Each entry maps a website category page to its fan-kit folder and JSON keys.
const SCRAPE_PAGES = [
  // Weapons
  { url: 'https://playshoptitans.com/blueprints/weapons/ws', folder: 'Swords',        category: 'weapons',      subcategory: 'sword' },
  { url: 'https://playshoptitans.com/blueprints/weapons/wa', folder: 'Axes',           category: 'weapons',      subcategory: 'axe' },
  { url: 'https://playshoptitans.com/blueprints/weapons/wd', folder: 'Daggers',        category: 'weapons',      subcategory: 'dagger' },
  { url: 'https://playshoptitans.com/blueprints/weapons/wm', folder: 'Maces',          category: 'weapons',      subcategory: 'mace' },
  { url: 'https://playshoptitans.com/blueprints/weapons/wp', folder: 'Spears',         category: 'weapons',      subcategory: 'spear' },
  { url: 'https://playshoptitans.com/blueprints/weapons/wb', folder: 'Bows',           category: 'weapons',      subcategory: 'bow' },
  { url: 'https://playshoptitans.com/blueprints/weapons/ww', folder: 'Wands',          category: 'weapons',      subcategory: 'wand' },
  { url: 'https://playshoptitans.com/blueprints/weapons/wt', folder: 'Staves',         category: 'weapons',      subcategory: 'staff' },
  { url: 'https://playshoptitans.com/blueprints/weapons/wg', folder: 'Guns',           category: 'weapons',      subcategory: 'gun' },
  { url: 'https://playshoptitans.com/blueprints/weapons/wc', folder: 'Crossbows',      category: 'weapons',      subcategory: 'crossbow' },
  { url: 'https://playshoptitans.com/blueprints/weapons/wi', folder: 'Instruments',    category: 'weapons',      subcategory: 'instrument' },
  { url: 'https://playshoptitans.com/blueprints/weapons/w2', folder: 'Dual Wields',    category: 'weapons',      subcategory: 'dual_wield' },
  { url: 'https://playshoptitans.com/blueprints/weapons/wy', folder: 'Catalysts',      category: 'weapons',      subcategory: 'catalyst' },
  // Armor
  { url: 'https://playshoptitans.com/blueprints/armor/ah',   folder: 'Heavy Armor',    category: 'armor',        subcategory: 'heavy_armor' },
  { url: 'https://playshoptitans.com/blueprints/armor/am',   folder: 'Light Armor',    category: 'armor',        subcategory: 'light_armor' },
  { url: 'https://playshoptitans.com/blueprints/armor/al',   folder: 'Clothes',        category: 'armor',        subcategory: 'clothes' },
  { url: 'https://playshoptitans.com/blueprints/armor/hh',   folder: 'Helmets',        category: 'armor',        subcategory: 'helmet' },
  { url: 'https://playshoptitans.com/blueprints/armor/hm',   folder: 'Rogue Hats',     category: 'armor',        subcategory: 'rogue_hat' },
  { url: 'https://playshoptitans.com/blueprints/armor/hl',   folder: 'Magician Hats',  category: 'armor',        subcategory: 'magician_hat' },
  { url: 'https://playshoptitans.com/blueprints/armor/gh',   folder: 'Gauntlets',      category: 'armor',        subcategory: 'gauntlets' },
  { url: 'https://playshoptitans.com/blueprints/armor/gl',   folder: 'Gloves',         category: 'armor',        subcategory: 'gloves' },
  { url: 'https://playshoptitans.com/blueprints/armor/bh',   folder: 'Heavy Footwear', category: 'armor',        subcategory: 'heavy_footwear' },
  { url: 'https://playshoptitans.com/blueprints/armor/bl',   folder: 'Light Footwear', category: 'armor',        subcategory: 'light_footwear' },
  // Accessories
  { url: 'https://playshoptitans.com/blueprints/accessories/uh', folder: 'Herbal Medicine', category: 'accessories', subcategory: 'herbal_medicine' },
  { url: 'https://playshoptitans.com/blueprints/accessories/up', folder: 'Potions',          category: 'accessories', subcategory: 'potion' },
  { url: 'https://playshoptitans.com/blueprints/accessories/us', folder: 'Spells',           category: 'accessories', subcategory: 'spell' },
  { url: 'https://playshoptitans.com/blueprints/accessories/xs', folder: 'Shields',          category: 'accessories', subcategory: 'shield' },
  { url: 'https://playshoptitans.com/blueprints/accessories/xr', folder: 'Rings',            category: 'accessories', subcategory: 'ring' },
  { url: 'https://playshoptitans.com/blueprints/accessories/xa', folder: 'Amulets',          category: 'accessories', subcategory: 'amulet' },
  { url: 'https://playshoptitans.com/blueprints/accessories/xc', folder: 'Cloaks',           category: 'accessories', subcategory: 'cloak' },
  { url: 'https://playshoptitans.com/blueprints/accessories/xf', folder: 'Familiars',        category: 'accessories', subcategory: 'familiar' },
  { url: 'https://playshoptitans.com/blueprints/accessories/xx', folder: 'Aurasongs',        category: 'accessories', subcategory: 'aurasong' },
  { url: 'https://playshoptitans.com/blueprints/accessories/xq', folder: 'Quivers',          category: 'accessories', subcategory: 'quiver' },
  { url: 'https://playshoptitans.com/blueprints/accessories/xi', folder: 'Idols',            category: 'accessories', subcategory: 'idol' },
  { url: 'https://playshoptitans.com/blueprints/accessories/fm', folder: 'Meals',            category: 'accessories', subcategory: 'meal' },
  { url: 'https://playshoptitans.com/blueprints/accessories/fd', folder: 'Desserts',         category: 'accessories', subcategory: 'dessert' },
  // Stones
  { url: 'https://playshoptitans.com/blueprints/stones/xu',      folder: 'Runestones',       category: 'stones',       subcategory: 'runestone' },
  { url: 'https://playshoptitans.com/blueprints/stones/xm',      folder: 'Moonstones',       category: 'stones',       subcategory: 'moonstone' },
  // Enchantments
  { url: 'https://playshoptitans.com/blueprints/enchantments/fire',   folder: 'Elements', category: 'enchantments', subcategory: 'fire' },
  { url: 'https://playshoptitans.com/blueprints/enchantments/water',  folder: 'Elements', category: 'enchantments', subcategory: 'water' },
  { url: 'https://playshoptitans.com/blueprints/enchantments/earth',  folder: 'Elements', category: 'enchantments', subcategory: 'earth' },
  { url: 'https://playshoptitans.com/blueprints/enchantments/air',    folder: 'Elements', category: 'enchantments', subcategory: 'air' },
  { url: 'https://playshoptitans.com/blueprints/enchantments/light',  folder: 'Elements', category: 'enchantments', subcategory: 'light' },
  { url: 'https://playshoptitans.com/blueprints/enchantments/dark',   folder: 'Elements', category: 'enchantments', subcategory: 'dark' },
  { url: 'https://playshoptitans.com/blueprints/enchantments/gold',   folder: 'Elements', category: 'enchantments', subcategory: 'gold' },
  { url: 'https://playshoptitans.com/blueprints/enchantments/spirit', folder: 'Spirits',  category: 'enchantments', subcategory: 'spirit' },
];

// Build name → { folder, imageFile } lookup
const IMAGE_LOOKUP = new Map();

function decodeHTMLEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&apos;/g, "'");
}

function parseItemsFromHTML(html, pageUrl) {
  // Item names live in CardBanner_contentText divs.
  // Item slugs live in the info-button links: href="/blueprints/CAT/SUBCAT/SLUG"
  // Both appear once per card in the same order, so we can pair them by index.
  // The slug equals the image filename without the .png extension.
  const nameRe = /CardBanner_contentText[^>]+>([^<]+)</g;
  const slugRe = /href="\/blueprints\/[^/]+\/[^/]+\/([^"/]+)"/g;

  const names = [];
  const slugs = [];
  let m;

  while ((m = nameRe.exec(html)) !== null) names.push(decodeHTMLEntities(m[1].trim()));
  while ((m = slugRe.exec(html)) !== null) slugs.push(m[1]);

  if (slugs.length !== names.length) {
    process.stdout.write(` (WARNING: ${slugs.length} slugs vs ${names.length} names)`);
  }

  const count = Math.min(slugs.length, names.length);
  return Array.from({ length: count }, (_, i) => ({
    imageFile: slugs[i] + '.png',
    name: names[i],
  }));
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchText(res.headers.location).then(resolve).catch(reject);
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function scrapeAllPages() {
  // Returns Map<name, { folder, imageFile, category, subcategory }>
  const result = new Map();
  for (const page of SCRAPE_PAGES) {
    process.stdout.write(`  Scraping ${page.url.replace('https://playshoptitans.com', '')}...`);
    try {
      const html = await fetchText(page.url);
      const pairs = parseItemsFromHTML(html, page.url);
      for (const { imageFile, name } of pairs) {
        result.set(name, { folder: page.folder, imageFile, category: page.category, subcategory: page.subcategory });
      }
      console.log(` ${pairs.length} items`);
    } catch (err) {
      console.log(` ERROR: ${err.message}`);
    }
    await sleep(150);
  }
  return result;
}

if (SCRAPE) {
  console.log(`Scraping item images from playshoptitans.com (${SCRAPE_PAGES.length} pages)...`);
  const scraped = await scrapeAllPages();
  console.log(`Scraped ${scraped.size} items total.\n`);

  for (const [name, { folder, imageFile }] of scraped) {
    IMAGE_LOOKUP.set(name, { folder, imageFile });
  }

  if (SAVE) {
    const jsonOut = {};
    for (const [name, { category, subcategory, imageFile }] of scraped) {
      if (!jsonOut[category]) jsonOut[category] = {};
      if (!jsonOut[category][subcategory]) jsonOut[category][subcategory] = [];
      jsonOut[category][subcategory].push({ name, image: imageFile });
    }
    const jsonPath = new URL('../src/blueprint-images.json', import.meta.url).pathname.replace(/^\//, '');
    fs.writeFileSync(jsonPath, JSON.stringify(jsonOut, null, 2) + '\n');
    console.log(`Saved to ${jsonPath}\n`);
  }
} else {
  const imageData = require('../src/blueprint-images.json');
  for (const category of Object.values(imageData)) {
    for (const [subKey, items] of Object.entries(category)) {
      const folder = SUBCATEGORY_TO_FOLDER[subKey];
      if (!folder) continue;
      for (const { name, image } of items) {
        IMAGE_LOOKUP.set(name, { folder, imageFile: image });
      }
    }
  }
}

function normalizeImageName(name) {
  return name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '') + '.png';
}

function resolveImages(name, type) {
  const resolvedType = type !== 'Enchantment' ? type
    : name.endsWith(' Spirit') ? 'Spirit'
    : 'Element';
  const folder = TYPE_TO_FOLDER[resolvedType];
  if (!folder) return null;

  const normalized = { folder, filename: normalizeImageName(name), resolvedType };
  const override = IMAGE_LOOKUP.get(name);
  if (override) {
    return { primary: { folder: override.folder, filename: override.imageFile }, fallback: normalized, resolvedType };
  }
  return { primary: normalized, fallback: null, resolvedType };
}

function parseCSV(text) {
  const rows = [];
  let current = '', inQuotes = false, row = [];
  for (let i = 0; i < text.length; i++) {
    const char = text[i], next = text[i + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') { current += '"'; i++; }
      else if (char === '"') inQuotes = false;
      else current += char;
    } else {
      if (char === '"') inQuotes = true;
      else if (char === ',') { row.push(current); current = ''; }
      else if (char === '\r' && next === '\n') { row.push(current); current = ''; rows.push(row); row = []; i++; }
      else if (char === '\n' || char === '\r') { row.push(current); current = ''; rows.push(row); row = []; }
      else current += char;
    }
  }
  if (row.length > 0 || current) { row.push(current); rows.push(row); }
  return rows;
}

// Downloads a single file from url to destPath.
// Returns 'ok', 'not-found', or 'error:<message>'.
function downloadFile(url, destPath) {
  return new Promise((resolve) => {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    const tmp = destPath + '.tmp';
    const file = fs.createWriteStream(tmp);

    const cleanup = (result) => {
      file.destroy();
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
      resolve(result);
    };

    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 404) {
        res.resume();
        cleanup('not-found');
        return;
      }
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        file.close();
        if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
        downloadFile(res.headers.location, destPath).then(resolve);
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        cleanup(`error:HTTP ${res.statusCode}`);
        return;
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          fs.renameSync(tmp, destPath);
          resolve('ok');
        });
      });
    }).on('error', (err) => cleanup(`error:${err.message}`));

    file.on('error', (err) => cleanup(`error:${err.message}`));
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// --- Fetch blueprints ---

console.log('Fetching blueprints...');
const csv = await fetchText(`https://docs.google.com/spreadsheets/d/1WLa7X8h3O0-aGKxeAlCL7bnN8-FhGd3t7pz2RCzSg8c/gviz/tq?tqx=out:csv&sheet=Blueprints`);
const rows = parseCSV(csv);
const headers = rows[0].map(h => h.trim());

const nameIdx = headers.indexOf('Name');
const typeIdx = headers.indexOf('Type');

const missing = {};
const unknownType = [];

for (let r = 1; r < rows.length; r++) {
  const row = rows[r];
  const name = row[nameIdx]?.trim();
  const type = row[typeIdx]?.trim();
  if (!name || !type || name === 'Name' || type === 'Type') continue;

  const resolved = resolveImages(name, type);
  if (!resolved) {
    unknownType.push({ name, type });
    continue;
  }

  const { primary, fallback, resolvedType } = resolved;
  const primaryPath = path.join(FAN_KIT_ITEMS, primary.folder, primary.filename);

  if (fs.existsSync(primaryPath)) continue;

  if (fallback) {
    const fallbackPath = path.join(FAN_KIT_ITEMS, fallback.folder, fallback.filename);
    if (fs.existsSync(fallbackPath)) continue;
  }

  if (!missing[resolvedType]) missing[resolvedType] = [];
  missing[resolvedType].push({
    name,
    destPath: path.join(FAN_KIT_ITEMS, primary.folder, primary.filename),
    filename: primary.filename,
    tried: [
      path.join(primary.folder, primary.filename),
      ...(fallback ? [path.join(fallback.folder, fallback.filename)] : []),
    ],
  });
}

// --- Report ---

const sortedTypes = Object.keys(missing).sort();

console.log('\n=== MISSING IMAGES (sorted by type) ===\n');
for (const type of sortedTypes) {
  console.log(`--- ${type} (${missing[type].length}) ---`);
  for (const { name, tried } of missing[type]) {
    console.log(`  ${name}`);
    for (const p of tried) console.log(`    ✗ ${p}`);
  }
  console.log();
}

if (unknownType.length > 0) {
  console.log('=== UNKNOWN TYPES (no folder mapping) ===');
  for (const { name, type } of unknownType) {
    console.log(`  [${type}] ${name}`);
  }
  console.log();
}

const totalBlueprints = rows.filter((r, i) => {
  if (i === 0) return false;
  const n = r[nameIdx]?.trim(), t = r[typeIdx]?.trim();
  return n && t && n !== 'Name' && t !== 'Type';
}).length;

const totalMissing = Object.values(missing).flat().length;
const bothTried = Object.values(missing).flat().filter(e => e.tried.length > 1).length;
console.log(`Summary: ${totalMissing} missing out of ${totalBlueprints} blueprints`);
if (bothTried > 0) console.log(`  ${bothTried} tried both scraped and normalized paths`);

if (!DOWNLOAD) {
  if (SCRAPE) {
    console.log('\nRun with --scrape --download to fetch missing images using website filenames.');
  } else {
    console.log('\nRun with --download to fetch missing images.');
    console.log('Run with --scrape to resolve filenames live from playshoptitans.com.');
    console.log('Run with --scrape --save to also update src/blueprint-images.json.');
  }
  process.exit(0);
}

// --- Download ---

const allMissing = Object.values(missing).flat();
console.log(`\nDownloading ${allMissing.length} images...\n`);

let downloaded = 0, notFound = 0, failed = 0;

for (const { name, filename, destPath } of allMissing) {
  const url = `${ASSET_BASE}/${filename}`;
  process.stdout.write(`  ${name} (${filename})... `);

  const result = await downloadFile(url, destPath);

  if (result === 'ok') {
    console.log('✓');
    downloaded++;
  } else if (result === 'not-found') {
    console.log('✗ not found on server');
    notFound++;
  } else {
    console.log(`✗ ${result}`);
    failed++;
  }

  await sleep(150);
}

console.log(`\nDownload complete: ${downloaded} saved, ${notFound} not found on server, ${failed} errors`);
