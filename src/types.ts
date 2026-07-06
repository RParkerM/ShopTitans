export interface Milestone {
  reward: string;
  craftsNeeded: number;
}

export interface AscensionUpgrade {
  description: string;
  shardCost: number;
}

export interface BlueprintComponent {
  name: string;
  amount: number;
  quality: string; // '---' or empty = standard component; 'Normal'/'Uncommon'/etc. = crafted item
}

export interface Resources {
  iron: number;
  wood: number;
  leather: number;
  herbs: number;
  steel: number;
  ironwood: number;
  fabric: number;
  oil: number;
  ether: number;     // spreadsheet column: "Ether", icon: mana
  jewels: number;    // spreadsheet column: "Jewels", icon: gems
  essence: number;
  stardust: number;  // no icon in fan kit
}

export interface Blueprint {
  name: string;
  type: string;
  tier: number;
  source: string;
  // Stats
  value: number;
  atk: number;
  def: number;
  hp: number;
  eva: number;
  crit: number;
  favor: number;
  airshipPower: number;
  // Milestones
  craftingMilestones: Milestone[];
  starforgedMilestones: Milestone[];
  // Ascension
  ascensionUpgrades: AscensionUpgrade[];
  // Resources
  resources: Resources;
  // Components
  components: BlueprintComponent[];
}

export interface UserBlueprintData {
  owned: boolean;
  starforged: boolean;
  ascensionLevel: number; // 0-3
  craftCount: number;
  ascensionShards: number;
}

export type UserData = Record<string, UserBlueprintData>;

/** Per-subtype goal star counts, keyed by blueprint type (e.g. 'Sword'). */
export type AscensionGoals = Record<string, number>;

/** Everything stored in (and synced for) one profile. */
export interface ProfileData {
  blueprints: UserData;
  ascensionGoals: AscensionGoals;
}

export interface ProfileMeta {
  id: string;
  name: string;
  updatedAt: number;      // ms timestamp of last local change
  driveFileId?: string;   // cached Drive file id, once synced
  lastSyncedAt?: number;  // updatedAt value at last successful sync
}

export type SyncStatus = 'disabled' | 'signedOut' | 'idle' | 'syncing' | 'error';

export interface SyncConflict {
  id: string;              // profile id
  name: string;
  localUpdatedAt: number;
  remoteUpdatedAt: number;
  remoteFileId: string;
}

export type ResourceKey = keyof Resources;
export type ResourceFilters = Partial<Record<ResourceKey, 'require' | 'exclude'>>;
export type ComponentFilters = Partial<Record<string, 'require' | 'exclude'>>;
