import imageData from '../blueprint-images.json';

// Maps spreadsheet Type values to fan kit Items subfolder names
const TYPE_TO_FOLDER: Record<string, string> = {
  // Weapons
  Sword: 'Swords',
  Axe: 'Axes',
  Dagger: 'Daggers',
  Mace: 'Maces',
  Spear: 'Spears',
  Staff: 'Staves',
  Wand: 'Wands',
  Bow: 'Bows',
  Crossbow: 'Crossbows',
  Gun: 'Guns',
  Instrument: 'Instruments',
  'Dual Wield': 'Dual Wields',
  Aurasong: 'Aurasongs',
  Catalyst: 'Catalysts',
  Spell: 'Spells',
  // Armor
  Helmet: 'Helmets',
  'Magician Hat': 'Magician Hats',
  'Rogue Hat': 'Rogue Hats',
  'Light Armor': 'Light Armor',
  'Heavy Armor': 'Heavy Armor',
  Clothes: 'Clothes',
  Gauntlets: 'Gauntlets',
  Gloves: 'Gloves',
  'Light Footwear': 'Light Footwear',
  'Heavy Footwear': 'Heavy Footwear',
  Shield: 'Shields',
  // Accessories
  Ring: 'Rings',
  Amulet: 'Amulets',
  Cloak: 'Cloaks',
  Quiver: 'Quivers',
  // Consumables
  Potion: 'Potions',
  Meal: 'Meals',
  Dessert: 'Desserts',
  'Herbal Medicine': 'Herbal Medicine',
  // Special
  Element: 'Elements',
  Spirit: 'Spirits',
  Familiar: 'Familiars',
  Moonstone: 'Moonstones',
  Runestone: 'Runestones',
  Idol: 'Idols',
};

// Maps JSON subcategory keys to fan kit folder names
const SUBCATEGORY_TO_FOLDER: Record<string, string> = {
  // weapons
  catalyst: 'Catalysts', bow: 'Bows', instrument: 'Instruments', axe: 'Axes',
  dual_wield: 'Dual Wields', sword: 'Swords', staff: 'Staves', gun: 'Guns',
  crossbow: 'Crossbows', dagger: 'Daggers', mace: 'Maces', spear: 'Spears', wand: 'Wands',
  // stones
  moonstone: 'Moonstones', runestone: 'Runestones',
  // armor
  gloves: 'Gloves', light_armor: 'Light Armor', gauntlets: 'Gauntlets', helmet: 'Helmets',
  clothes: 'Clothes', light_footwear: 'Light Footwear', magician_hat: 'Magician Hats',
  heavy_footwear: 'Heavy Footwear', rogue_hat: 'Rogue Hats', heavy_armor: 'Heavy Armor',
  // enchantments (elements share one folder; spirit has its own)
  light: 'Elements', earth: 'Elements', water: 'Elements', fire: 'Elements',
  gold: 'Elements', air: 'Elements', dark: 'Elements', spirit: 'Spirits',
  // accessories
  meal: 'Meals', amulet: 'Amulets', dessert: 'Desserts', herbal_medicine: 'Herbal Medicine',
  familiar: 'Familiars', potion: 'Potions', ring: 'Rings', shield: 'Shields',
  cloak: 'Cloaks', idol: 'Idols', spell: 'Spells', aurasong: 'Aurasongs', quiver: 'Quivers',
};

// Build flat name → { folder, imageFile } lookup from the JSON at module load time
const IMAGE_LOOKUP = new Map<string, { folder: string; imageFile: string }>();

for (const category of Object.values(imageData) as Record<string, { name: string; image: string }[]>[]) {
  for (const [subKey, items] of Object.entries(category)) {
    const folder = SUBCATEGORY_TO_FOLDER[subKey];
    if (!folder) continue;
    for (const { name, image } of items) {
      IMAGE_LOOKUP.set(name, { folder, imageFile: image });
    }
  }
}

const CIRCLE_BASE = '/fan-kit/Blueprint%20Types/Backgrounds';

const LCOG_CHESTS = new Set(['Opulent Chest', 'Luxurious Chest', 'Platinum Chest']);

const STANDARD_SOURCES = new Set([
  '---', '', 'Intro Tutorial', 'Collection Book',
  'Blacksmith', 'Carpenter', 'Herbalist', 'Wizard', 'Tailor', 'Jeweler', 'Cook', 'Priestess',
]);

function getCircleBackground(source: string): string {
  if (source === 'Major Artifact Chest' || source === 'Minor Artifact Chest')
    return `${CIRCLE_BASE}/img_card_circle_blueprint_artifact.png`;
  if (LCOG_CHESTS.has(source))
    return `${CIRCLE_BASE}/img_card_circle_blueprint_lcog.png`;
  if (source.endsWith('Chest'))
    return `${CIRCLE_BASE}/img_card_circle_blueprint_chest.png`;
  if (source.startsWith('Content Pass') || STANDARD_SOURCES.has(source))
    return `${CIRCLE_BASE}/img_card_circle_blueprint.png`;
  // All packs, offers, and anything else unrecognised
  return `${CIRCLE_BASE}/img_card_circle_blueprint_premium.png`;
}

function normalizeImageName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '') + '.png';
}

export function getBlueprintImages(name: string, type: string, source: string) {
  const override = IMAGE_LOOKUP.get(name);
  const folder = TYPE_TO_FOLDER[type];
  const normalizedUrl = folder
    ? `/fan-kit/Items/${encodeURIComponent(folder)}/${normalizeImageName(name)}`
    : null;

  let itemImage: string | null;
  let itemImageFallback: string | null = null;

  if (override) {
    itemImage = `/fan-kit/Items/${encodeURIComponent(override.folder)}/${override.imageFile}`;
    itemImageFallback = normalizedUrl;
  } else {
    itemImage = normalizedUrl;
  }

  return {
    circleBackground: getCircleBackground(source),
    itemImage,
    itemImageFallback,
  };
}
