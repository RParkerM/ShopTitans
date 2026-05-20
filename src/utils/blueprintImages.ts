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

// Maps tier to the circular card background image from Blueprint Types/Backgrounds
function getCircleBackground(tier: number): string {
  if (tier >= 13) return '/fan-kit/Blueprint%20Types/Backgrounds/img_card_circle_blueprint_artifact.png';
  if (tier >= 7)  return '/fan-kit/Blueprint%20Types/Backgrounds/img_card_circle_blueprint_premium.png';
  if (tier >= 4)  return '/fan-kit/Blueprint%20Types/Backgrounds/img_card_circle_blueprint_blue.png';
  return '/fan-kit/Blueprint%20Types/Backgrounds/img_card_circle_blueprint.png';
}

function normalizeImageName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '') + '.png';
}

export function getBlueprintImages(name: string, type: string, tier: number) {
  const folder = TYPE_TO_FOLDER[type];
  const itemImage = folder
    ? `/fan-kit/Items/${encodeURIComponent(folder)}/${normalizeImageName(name)}`
    : null;

  return {
    circleBackground: getCircleBackground(tier),
    itemImage,
  };
}
