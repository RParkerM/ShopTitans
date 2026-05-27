export type MainCategory = 'All' | 'Weapons' | 'Armor' | 'Accessories' | 'Stones' | 'Enchantments';

const FILTER = '/fan-kit/Filter%20Types';
const ITEM = '/fan-kit/Item%20Types';

export interface CategoryDef {
  id: MainCategory;
  label: string;
  icon: string;
}

export interface SubCategory {
  label: string;
  value: string;
  icon: string;
}

export const MAIN_CATEGORIES: CategoryDef[] = [
  { id: 'All',          label: 'All',          icon: `${FILTER}/icon_global_itemtype_all_landscape_selected.png` },
  { id: 'Weapons',      label: 'Weapons',      icon: `${FILTER}/icon_global_itemtype_weapons_landscape_selected.png` },
  { id: 'Armor',        label: 'Armor',        icon: `${FILTER}/icon_global_itemtype_armor_landscape_selected.png` },
  { id: 'Accessories',  label: 'Accessories',  icon: `${FILTER}/icon_global_itemtype_accessories_landscape_selected.png` },
  { id: 'Stones',       label: 'Stones',       icon: `${FILTER}/icon_global_itemtype_stones_landscape_selected.png` },
  { id: 'Enchantments', label: 'Enchantments', icon: `${FILTER}/icon_global_itemtype_enchantment_landscape_selected.png` },
];

export const SUBCATEGORIES: Record<Exclude<MainCategory, 'All'>, SubCategory[]> = {
  Weapons: [
    { label: 'Swords',      value: 'Sword',       icon: `${ITEM}/icon_global_item_sword_big.png` },
    { label: 'Axes',        value: 'Axe',         icon: `${ITEM}/icon_global_item_axe_big.png` },
    { label: 'Daggers',     value: 'Dagger',      icon: `${ITEM}/icon_global_item_dagger_big.png` },
    { label: 'Maces',       value: 'Mace',        icon: `${ITEM}/icon_global_item_mace_big.png` },
    { label: 'Spears',      value: 'Spear',       icon: `${ITEM}/icon_global_item_spear_big.png` },
    { label: 'Bows',        value: 'Bow',         icon: `${ITEM}/icon_global_item_bow_big.png` },
    { label: 'Wands',       value: 'Wand',        icon: `${ITEM}/icon_global_item_wand_big.png` },
    { label: 'Staves',      value: 'Staff',       icon: `${ITEM}/icon_global_item_staff_big.png` },
    { label: 'Guns',        value: 'Gun',         icon: `${ITEM}/icon_global_item_gun_big.png` },
    { label: 'Crossbows',   value: 'Crossbow',    icon: `${ITEM}/icon_global_item_crossbow_big.png` },
    { label: 'Instruments', value: 'Instrument',  icon: `${ITEM}/icon_global_item_instrument_big.png` },
    { label: 'Dual Wield',  value: 'Dual Wield',  icon: `${ITEM}/icon_global_item_dualwield_big.png` },
    { label: 'Catalysts',   value: 'Catalyst',    icon: `${ITEM}/icon_global_item_catalyst_big.png` },
  ],
  Armor: [
    { label: 'Heavy Armor',    value: 'Heavy Armor',    icon: `${ITEM}/icon_global_item_armorheavy_big.png` },
    { label: 'Light Armor',    value: 'Light Armor',    icon: `${ITEM}/icon_global_item_armorlight_big.png` },
    { label: 'Clothes',        value: 'Clothes',        icon: `${ITEM}/icon_global_item_armormedium_big.png` },
    { label: 'Helmets',        value: 'Helmet',         icon: `${ITEM}/icon_global_item_helmet_big.png` },
    { label: 'Rogue Hats',     value: 'Rogue Hat',      icon: `${ITEM}/icon_global_item_roguehat_big.png` },
    { label: 'Magician Hats',  value: 'Magician Hat',   icon: `${ITEM}/icon_global_item_hat_big.png` },
    { label: 'Gauntlets',      value: 'Gauntlets',      icon: `${ITEM}/icon_global_item_gauntlets_big.png` },
    { label: 'Gloves',         value: 'Gloves',         icon: `${ITEM}/icon_global_item_bracers_big.png` },
    { label: 'Heavy Footwear', value: 'Heavy Footwear', icon: `${ITEM}/icon_global_item_boots_big.png` },
    { label: 'Light Footwear', value: 'Light Footwear', icon: `${ITEM}/icon_global_item_shoes_big.png` },
  ],
  Accessories: [
    { label: 'Herbal Medicine', value: 'Herbal Medicine', icon: `${ITEM}/icon_global_item_herb_big.png` },
    { label: 'Potions',         value: 'Potion',          icon: `${ITEM}/icon_global_item_potion_big.png` },
    { label: 'Spells',          value: 'Spell',           icon: `${ITEM}/icon_global_item_scrolls_big.png` },
    { label: 'Shields',         value: 'Shield',          icon: `${ITEM}/icon_global_item_shield_big.png` },
    { label: 'Rings',           value: 'Ring',            icon: `${ITEM}/icon_global_item_ring_big.png` },
    { label: 'Amulets',         value: 'Amulet',          icon: `${ITEM}/icon_global_item_amulet_big.png` },
    { label: 'Cloaks',          value: 'Cloak',           icon: `${ITEM}/icon_global_item_cloak_big.png` },
    { label: 'Familiars',       value: 'Familiar',        icon: `${ITEM}/icon_global_item_familiar_big.png` },
    { label: 'Aurasongs',       value: 'Aurasong',        icon: `${ITEM}/icon_global_item_aurastone_big.png` },
    { label: 'Quivers',         value: 'Quiver',          icon: `${ITEM}/icon_global_item_quiver_big.png` },
    { label: 'Idols',           value: 'Idol',            icon: `${ITEM}/icon_global_item_idol_big.png` },
    { label: 'Meals',           value: 'Meal',            icon: `${ITEM}/icon_global_item_meal_big.png` },
    { label: 'Desserts',        value: 'Dessert',         icon: `${ITEM}/icon_global_item_dessert_big.png` },
  ],
  Stones: [
    { label: 'Runestones',  value: 'Runestone', icon: `${ITEM}/icon_global_item_rune_big.png` },
    { label: 'Moonstones',  value: 'Moonstone', icon: `${ITEM}/icon_global_item_moonstone_big.png` },
  ],
  Enchantments: [
    { label: 'Fire',   value: 'Fire',   icon: `${ITEM}/icon_global_item_fire_big.png` },
    { label: 'Water',  value: 'Water',  icon: `${ITEM}/icon_global_item_water_big.png` },
    { label: 'Earth',  value: 'Earth',  icon: `${ITEM}/icon_global_item_earth_big.png` },
    { label: 'Air',    value: 'Air',    icon: `${ITEM}/icon_global_item_air_big.png` },
    { label: 'Light',  value: 'Light',  icon: `${ITEM}/icon_global_item_light_big.png` },
    { label: 'Dark',   value: 'Dark',   icon: `${ITEM}/icon_global_item_dark_big.png` },
    { label: 'Gold',   value: 'Gold',   icon: `${ITEM}/icon_global_item_gold_big.png` },
    { label: 'Spirit', value: 'Spirit', icon: `${ITEM}/icon_global_item_spirit_big.png` },
  ],
};

export const TYPE_TO_CATEGORY: Record<string, Exclude<MainCategory, 'All'>> = {
  // Weapons
  Sword: 'Weapons', Axe: 'Weapons', Dagger: 'Weapons', Mace: 'Weapons',
  Spear: 'Weapons', Bow: 'Weapons', Wand: 'Weapons', Staff: 'Weapons',
  Gun: 'Weapons', Crossbow: 'Weapons', Instrument: 'Weapons',
  'Dual Wield': 'Weapons', Catalyst: 'Weapons',
  // Armor
  'Heavy Armor': 'Armor', 'Light Armor': 'Armor', Clothes: 'Armor',
  Helmet: 'Armor', 'Rogue Hat': 'Armor', 'Magician Hat': 'Armor',
  Gauntlets: 'Armor', Gloves: 'Armor', 'Heavy Footwear': 'Armor', 'Light Footwear': 'Armor',
  // Accessories
  'Herbal Medicine': 'Accessories', Potion: 'Accessories', Spell: 'Accessories',
  Shield: 'Accessories', Ring: 'Accessories', Amulet: 'Accessories',
  Cloak: 'Accessories', Familiar: 'Accessories', Aurasong: 'Accessories',
  Quiver: 'Accessories', Idol: 'Accessories', Meal: 'Accessories', Dessert: 'Accessories',
  // Stones
  Runestone: 'Stones', Moonstone: 'Stones',
  // Enchantments (useBlueprints splits the sheet's "Enchantment" into Element / Spirit)
  Element: 'Enchantments', Spirit: 'Enchantments',
};

const ELEMENT_BY_FIRST_WORD: Record<string, string> = {
  // Fire
  Ember: 'Fire', Flame: 'Fire', Blaze: 'Fire', Inferno: 'Fire', Blistering: 'Fire',
  // Water
  Bubble: 'Water', Tide: 'Water', Flood: 'Water', Torrent: 'Water', Maelstrom: 'Water',
  // Earth
  Nature: 'Earth', Wild: 'Earth', Primal: 'Earth', Primeval: 'Earth', Gaia: 'Earth',
  // Air
  Breeze: 'Air', Gale: 'Air', Tempest: 'Air', Hurricane: 'Air', Tornado: 'Air',
  // Light
  Light: 'Light', Holy: 'Light', Sacred: 'Light', Divine: 'Light', Apotheosis: 'Light',
  // Dark
  Corrupted: 'Dark', Unholy: 'Dark', Nightmare: 'Dark', Abyssal: 'Dark', Oblivion: 'Dark',
  // Gold
  Luxurious: 'Gold', Opulent: 'Gold', Platinum: 'Gold',
};

export function getEnchantmentElement(name: string, type: string): string {
  if (type === 'Spirit') return 'Spirit';
  return ELEMENT_BY_FIRST_WORD[name.split(' ')[0]] ?? '';
}
