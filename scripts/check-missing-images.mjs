import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

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
  'Herbal Medicine': 'Herbal Medicine', Familiar: 'Familiars', Spirit: 'Spirits',
  Moonstone: 'Moonstones', Runestone: 'Runestones', Idol: 'Idols', Element: 'Elements',
};

function normalizeImageName(name) {
  return name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '') + '.png';
}

function resolveFolder(type, name) {
  if (type === 'Enchantment') {
    if (name.endsWith(' Element')) return 'Elements';
    if (name.endsWith(' Spirit')) return 'Spirits';
    return null;
  }
  return TYPE_TO_FOLDER[type] ?? null;
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

  const folder = resolveFolder(type, name);
  if (!folder) {
    unknownType.push({ name, type });
    continue;
  }

  const filename = normalizeImageName(name);
  const filePath = path.join(FAN_KIT_ITEMS, folder, filename);

  if (!fs.existsSync(filePath)) {
    if (!missing[type]) missing[type] = [];
    missing[type].push({ name, expected: path.join(folder, filename) });
  }
}

const sortedTypes = Object.keys(missing).sort();

console.log('\n=== MISSING IMAGES (sorted by type) ===\n');
for (const type of sortedTypes) {
  console.log(`--- ${type} (${missing[type].length}) ---`);
  for (const { name, expected } of missing[type]) {
    console.log(`  ${name}  →  ${expected}`);
  }
  console.log();
}

if (unknownType.length > 0) {
  console.log(`=== UNKNOWN TYPES (no folder mapping) ===`);
  for (const { name, type } of unknownType) {
    console.log(`  [${type}] ${name}`);
  }
}

const totalBlueprints = rows.filter((r, i) => {
  if (i === 0) return false;
  const n = r[nameIdx]?.trim(), t = r[typeIdx]?.trim();
  return n && t && n !== 'Name' && t !== 'Type';
}).length;

const totalMissing = Object.values(missing).reduce((s, arr) => s + arr.length, 0);
console.log(`\nSummary: ${totalMissing} missing out of ${totalBlueprints} blueprints`);
