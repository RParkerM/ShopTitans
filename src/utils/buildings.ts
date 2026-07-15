const PORTRAIT = '/fan-kit/Character%20Portraits';

export const BUILDING_CATEGORIES = ['Workers', 'Resources', 'City'] as const;
export type BuildingCategory = typeof BUILDING_CATEGORIES[number];

export interface BuildingMeta {
  category: BuildingCategory;
  /** Display order within the category (from src/workers.md). */
  order: number;
  icon: string;
}

// Categories, ordering, and portrait icons per building — source: src/workers.md
const CATEGORY_DEFS: Record<BuildingCategory, [name: string, image: string][]> = {
  Workers: [
    ['Smithy', 'blacksmith_head.png'],
    ['Wood Workshop', 'carpenter_head.png'],
    ['Tailor Workshop', 'tailor_head.png'],
    ['Apothecary', 'herbalist_head.png'],
    ['Jewel Workshop', 'jeweler_head.png'],
    ['Wizard Tower', 'wizard_head.png'],
    ['Temple', 'priest_head.png'],
    ['Laboratory', 'engineer_head.png'],
    ['Academy', 'academy_head.png'],
    ["Summoner's Tent", 'elven_head.png'],
    ['Luna Tower', 'moondragon_head.png'],
    ['Sol Tower', 'sundragon_head.png'],
    ['Bakery', 'baker_head.png'],
    ['Restaurant', 'cook_head.png'],
    ['Amphitheatre', 'bard_head.png'],
    ['Military Camp', 'veteran_head.png'],
    ['Wind Nexus', 'elemental_head.png'],
    ['Master Lodge', 'master_head.png'],
  ],
  Resources: [
    ['Iron Mine', 'iron_head.png'],
    ['Lumberyard', 'wood_head.png'],
    ['Tannery', 'leather_head.png'],
    ['Garden', 'herbs_head.png'],
    ['Smelter', 'steel_head.png'],
    ['Ironwood Sawmill', 'ironwood_head.png'],
    ['Weaver Mill', 'fabric_head.png'],
    ['Oil Press', 'oils_head.png'],
    ['Jewel Storehouse', 'gems_head.png'],
    ['Ether Well', 'mana_head.png'],
    ['Mausoleum', 'essence_head.png'],
  ],
  City: [
    ['Town Hall', 'elderowen_head.png'],
    ['Emerald Inn', 'inn_head.png'],
    ['Tavern', 'tavern_head.png'],
    ['Training Hall', 'argon_head.png'],
  ],
};

export const BUILDING_META: Record<string, BuildingMeta> = {};
for (const category of BUILDING_CATEGORIES) {
  CATEGORY_DEFS[category].forEach(([name, image], order) => {
    BUILDING_META[name] = { category, order, icon: `${PORTRAIT}/${image}` };
  });
}
