export interface Milestone {
  reward: string;
  craftsNeeded: number;
}

export interface Blueprint {
  name: string;
  type: string;
  tier: number;
  craftingMilestones: Milestone[];
  starforgedMilestones: Milestone[];
}

export interface UserBlueprintData {
  owned: boolean;
  starforged: boolean;
  ascensionLevel: number; // 0–3
  craftCount: number;
}

export type UserData = Record<string, UserBlueprintData>;
