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
  Pistol: 'Guns',
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
  Familiar: 'Familiars',
  Spirit: 'Spirits',
  Moonstone: 'Moonstones',
  Runestone: 'Runestones',
  Idol: 'Idols',
  Element: 'Elements',
};

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
  const folder = TYPE_TO_FOLDER[type];
  const itemImage = folder
    ? `/fan-kit/Items/${encodeURIComponent(folder)}/${normalizeImageName(name)}`
    : null;

  return {
    circleBackground: getCircleBackground(source),
    itemImage,
  };
}
