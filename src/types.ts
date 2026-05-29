export interface Milestone {
  reward: string;
  craftsNeeded: number;
}

export interface AscensionUpgrade {
  description: string;
  shardCost: number;
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
}

export interface UserBlueprintData {
  owned: boolean;
  starforged: boolean;
  ascensionLevel: number; // 0-3
  craftCount: number;
  ascensionShards: number;
}

export type UserData = Record<string, UserBlueprintData>;
