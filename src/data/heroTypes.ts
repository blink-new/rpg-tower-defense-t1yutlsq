import { HeroType } from '../types/game'

export const HERO_TYPES: Record<'archer' | 'warrior' | 'mage', HeroType> = {
  archer: {
    id: 'archer',
    name: 'Archer',
    emoji: '🏹',
    cost: 50,
    description: 'Attaque à distance avec une précision élevée et vitesse rapide',
    specialEffect: 'Ralentit les cibles de 20% pendant 2 secondes',
    baseStats: {
      damage: 5,
      attackSpeed: 3,
      accuracy: 70,
      criticalChance: 35
    },
    attackConfig: {
      type: 'monocible',
      shape: 'diamant',
      minRange: 3,
      maxRange: 3,
      maxTargets: 1
    }
  },
  warrior: {
    id: 'warrior',
    name: 'Guerrier',
    emoji: '⚔️',
    cost: 75,
    description: 'Combattant au corps à corps avec attaque multicible en ligne',
    specialEffect: '20% de chance de stun pendant 1 seconde',
    baseStats: {
      damage: 8,
      attackSpeed: 2,
      accuracy: 85,
      criticalChance: 20
    },
    attackConfig: {
      type: 'monocible',
      shape: 'ligne',
      minRange: 1,
      maxRange: 1,
      maxTargets: 2
    }
  },
  mage: {
    id: 'mage',
    name: 'Mage',
    emoji: '🔮',
    cost: 100,
    description: 'Lanceur de sorts avec des attaques de zone en carré',
    specialEffect: 'Inflige 2 dégâts de feu par seconde pendant 3 secondes (6 dégâts max)',
    baseStats: {
      damage: 12,
      attackSpeed: 0.8,
      accuracy: 60,
      criticalChance: 5
    },
    attackConfig: {
      type: 'AOE',
      shape: 'carré',
      minRange: 1,
      maxRange: 1,
      aoeRadius: 2,
      maxTargets: 3
    }
  }
}