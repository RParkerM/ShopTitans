import type { Blueprint, UserBlueprintData } from '../types';

export interface GoalStatus {
  goal: number;
  earned: number;      // stars already unlocked on owned blueprints
  needed: number;      // stars still missing (0 when met)
  /** Min shards (net of shards already held per blueprint) to reach the goal;
   *  null when not reachable with the considered blueprint pool. */
  cost: number | null;
}

/**
 * Cheapest way to gain `needed` more stars across the subtype's owned
 * blueprints. Each blueprint contributes a prefix of its remaining upgrades
 * (stars unlock in order), and shards held for a blueprint offset its own
 * costs — so greedy per-star picking isn't exact; a tiny knapsack DP is.
 */
function minShardCost(
  blueprints: Blueprint[],
  getUserData: (name: string) => UserBlueprintData,
  needed: number,
  ownedOnly: boolean,
): number | null {
  const INF = Number.POSITIVE_INFINITY;
  const dp = new Array<number>(needed + 1).fill(INF);
  dp[0] = 0;
  for (const bp of blueprints) {
    const data = getUserData(bp.name);
    if (ownedOnly && !data.owned) continue;
    const maxStars = Math.min(bp.ascensionUpgrades.length, 3);
    const current = Math.min(data.ascensionLevel, maxStars);
    const avail = maxStars - current;
    if (avail <= 0) continue;
    // Net cost of taking m more stars on this blueprint.
    const costs: number[] = [];
    let cum = 0;
    for (let m = 1; m <= avail; m++) {
      cum += bp.ascensionUpgrades[current + m - 1].shardCost;
      costs.push(Math.max(0, cum - data.ascensionShards));
    }
    // Descending j: dp[j - m] still excludes this blueprint, so each
    // blueprint contributes at most one prefix.
    for (let j = needed; j >= 1; j--) {
      for (let m = 1; m <= Math.min(avail, j); m++) {
        const c = dp[j - m] + costs[m - 1];
        if (c < dp[j]) dp[j] = c;
      }
    }
  }
  return dp[needed] === INF ? null : dp[needed];
}

export function getGoalStatus(
  goal: number,
  blueprints: Blueprint[],
  getUserData: (name: string) => UserBlueprintData,
  ownedOnly: boolean,
): GoalStatus {
  let earned = 0;
  for (const bp of blueprints) {
    const data = getUserData(bp.name);
    if (!data.owned) continue;
    earned += Math.min(data.ascensionLevel, Math.min(bp.ascensionUpgrades.length, 3));
  }
  const needed = Math.max(0, goal - earned);
  const cost = needed === 0 ? 0 : minShardCost(blueprints, getUserData, needed, ownedOnly);
  return { goal, earned, needed, cost };
}
