import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const FAN_KIT_ITEMS = 'C:/Development/Fan Kit Assets (Shop Titans)/Items';

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

// Build name → { folder, imageFile } from blueprint-images.json (same logic as the app)
const IMAGE_LOOKUP = new Map();
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

function fetchCSV(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchCSV(res.headers.location).then(resolve).catch(reject);
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
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

const SHEET_ID = '1WLa7X8h3O0-aGKxeAlCL7bnN8-FhGd3t7pz2RCzSg8c';
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Blueprints`;

console.log('Fetching blueprints...');
const csv = await fetchCSV(url);
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

  // Primary missing — try normalized fallback before reporting
  if (fallback) {
    const fallbackPath = path.join(FAN_KIT_ITEMS, fallback.folder, fallback.filename);
    if (fs.existsSync(fallbackPath)) continue;
  }

  if (!missing[resolvedType]) missing[resolvedType] = [];
  const tried = [path.join(primary.folder, primary.filename)];
  if (fallback) tried.push(path.join(fallback.folder, fallback.filename));
  missing[resolvedType].push({ name, tried });
}

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

const totalMissing = Object.values(missing).reduce((s, arr) => s + arr.length, 0);
const bothTried = Object.values(missing).flat().filter(e => e.tried.length > 1).length;
console.log(`Summary: ${totalMissing} missing out of ${totalBlueprints} blueprints`);
if (bothTried > 0) console.log(`  ${bothTried} tried both JSON and normalized paths`);
