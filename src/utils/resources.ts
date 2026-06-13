import type { ResourceKey } from '../types';

const RES = '/fan-kit/Resources';

export interface ResourceDef {
  key: ResourceKey;
  label: string;
  icon: string;
}

export const RESOURCE_DEFS: ResourceDef[] = [
  { key: 'iron',     label: 'Iron',     icon: `${RES}/icon_global_resource_iron.png` },
  { key: 'wood',     label: 'Wood',     icon: `${RES}/icon_global_resource_wood.png` },
  { key: 'leather',  label: 'Leather',  icon: `${RES}/icon_global_resource_leather.png` },
  { key: 'herbs',    label: 'Herbs',    icon: `${RES}/icon_global_resource_herbs.png` },
  { key: 'steel',    label: 'Steel',    icon: `${RES}/icon_global_resource_steel.png` },
  { key: 'ironwood', label: 'Ironwood', icon: `${RES}/icon_global_resource_ironwood.png` },
  { key: 'fabric',   label: 'Fabric',   icon: `${RES}/icon_global_resource_fabric.png` },
  { key: 'oil',      label: 'Oil',      icon: `${RES}/icon_global_resource_oils.png` },
  { key: 'ether',    label: 'Ether',    icon: `${RES}/icon_global_resource_mana.png` },
  { key: 'jewels',   label: 'Jewels',   icon: `${RES}/icon_global_resource_gems.png` },
  { key: 'essence',  label: 'Essence',  icon: `${RES}/icon_global_resource_essence.png` },
  { key: 'stardust', label: 'Stardust', icon: `${RES}/icon_global_resource_stardust.png` },
];
