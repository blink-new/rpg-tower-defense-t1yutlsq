import { EnemyType } from '../types/game'

export interface EnemyTier {
  tier: 'D' | 'C' | 'B' | 'A' | 'S'
  experienceReward: number
}

export const ENEMY_TYPES: Record<string, EnemyType & EnemyTier> = {
  goblin: {
    id: 'goblin',
    name: 'Gobelin',
    emoji: '👹',
    health: 50,
    speed: 80, // pixels par seconde
    reward: 5,
    tier: 'D',
    experienceReward: 5
  },
  skeleton: {
    id: 'skeleton',
    name: 'Squelette',
    emoji: '💀',
    health: 75,
    speed: 70,
    reward: 8,
    tier: 'D',
    experienceReward: 5
  },
  orc: {
    id: 'orc',
    name: 'Orc',
    emoji: '🧌',
    health: 100,
    speed: 60,
    reward: 10,
    tier: 'C',
    experienceReward: 10
  },
  troll: {
    id: 'troll',
    name: 'Troll',
    emoji: '👺',
    health: 200,
    speed: 40,
    reward: 20,
    tier: 'B',
    experienceReward: 20
  },
  demon: {
    id: 'demon',
    name: 'Démon',
    emoji: '😈',
    health: 150,
    speed: 90,
    reward: 15,
    tier: 'B',
    experienceReward: 20
  },
  dragon: {
    id: 'dragon',
    name: 'Dragon',
    emoji: '🐉',
    health: 300,
    speed: 50,
    reward: 30,
    tier: 'A',
    experienceReward: 35
  }
}

// Fonction pour obtenir un type d'ennemi aléatoire
export function getRandomEnemyType(): string {
  const types = Object.keys(ENEMY_TYPES)
  return types[Math.floor(Math.random() * types.length)]
}

// Fonction pour obtenir un type d'ennemi selon la vague
export function getEnemyTypeForWave(wave: number): string {
  if (wave <= 2) {
    return Math.random() < 0.8 ? 'goblin' : 'skeleton'
  } else if (wave <= 5) {
    const rand = Math.random()
    if (rand < 0.4) return 'goblin'
    if (rand < 0.7) return 'skeleton'
    return 'orc'
  } else if (wave <= 10) {
    const rand = Math.random()
    if (rand < 0.3) return 'orc'
    if (rand < 0.6) return 'skeleton'
    if (rand < 0.8) return 'troll'
    return 'demon'
  } else {
    // Vagues avancées - plus de variété
    const rand = Math.random()
    if (rand < 0.15) return 'orc'
    if (rand < 0.35) return 'troll'
    if (rand < 0.55) return 'demon'
    if (rand < 0.75) return 'skeleton'
    return 'dragon'
  }
}

// Fonction pour obtenir l'XP d'un ennemi selon son tier
export function getEnemyExperience(enemyType: string): number {
  return ENEMY_TYPES[enemyType]?.experienceReward || 5
}