// XP needed to go from level N to level N+1 (MEE6-style formula)
export function xpForLevel(level: number): number {
  return 5 * level * level + 50 * level + 100;
}

// Total XP required to reach a given level from 0
export function totalXpForLevel(targetLevel: number): number {
  let total = 0;
  for (let i = 0; i < targetLevel; i++) total += xpForLevel(i);
  return total;
}

// Compute current level and XP progress from raw total XP
export function computeLevel(totalXp: number): { level: number; currentXp: number; neededXp: number } {
  let level = 0;
  let remaining = totalXp;
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level++;
  }
  return { level, currentXp: remaining, neededXp: xpForLevel(level) };
}

// Random XP per message
export function randomXp(): number {
  return Math.floor(Math.random() * 11) + 15; // 15–25
}

// In-memory cooldown: key = `${guildId}:${userId}`, value = timestamp of last XP grant
const cooldowns = new Map<string, number>();
const COOLDOWN_MS = 60_000;

export function isOnCooldown(guildId: string, userId: string): boolean {
  const key = `${guildId}:${userId}`;
  const last = cooldowns.get(key) ?? 0;
  if (Date.now() - last < COOLDOWN_MS) return true;
  cooldowns.set(key, Date.now());
  return false;
}
