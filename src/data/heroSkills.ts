import { SkillConfig } from '../types/game'

// Compétences communes à tous les héros
export const COMMON_SKILLS: Record<string, SkillConfig> = {
  damageBoost: {
    id: 'damageBoost',
    name: 'Force',
    description: 'Augmente les dégâts de base',
    maxLevel: 5,
    cost: 1,
    goldCost: 20, // 20 or par niveau
    effect: '+10% dégâts par niveau'
  },
  speedBoost: {
    id: 'speedBoost',
    name: 'Célérité',
    description: 'Augmente la vitesse d\'attaque',
    maxLevel: 5,
    cost: 1,
    goldCost: 20, // 20 or par niveau
    effect: '+15% vitesse d\'attaque par niveau'
  },
  accuracyBoost: {
    id: 'accuracyBoost',
    name: 'Précision',
    description: 'Améliore la précision des attaques',
    maxLevel: 3,
    cost: 1,
    goldCost: 50, // 50 or par niveau
    effect: '+15% précision par niveau'
  },
  criticalBoost: {
    id: 'criticalBoost',
    name: 'Critique',
    description: 'Augmente les chances de coup critique',
    maxLevel: 3,
    cost: 1,
    goldCost: 50, // 50 or par niveau
    effect: '+8% chance critique par niveau'
  }
}

// Compétences spéciales de l'Archer
export const ARCHER_SKILLS: Record<string, SkillConfig> = {
  specialSkill1: {
    id: 'multiShot',
    name: 'Tir Multiple',
    description: 'Passif : augmente le nombre de cibles touchées',
    maxLevel: 3,
    cost: 1, // 1 SP seulement
    goldCost: 250, // 250 or (0/3 rangs)
    effect: '+1 cible par niveau (max 4 cibles au total)'
  },
  specialSkill2: {
    id: 'piercingShot',
    name: 'Tir Perforant',
    description: 'Passif : augmente la réduction de vitesse des cibles touchées',
    maxLevel: 3,
    cost: 1, // 1 SP seulement
    goldCost: 250, // 250 or (0/3 rangs)
    effect: '+10% réduction de vitesse par niveau'
  },
  specialSkill3: {
    id: 'fireArrow',
    name: 'Flèche Enflammée',
    description: 'Passif : chance de brûler les cibles touchées',
    maxLevel: 2,
    cost: 1, // 1 SP seulement
    goldCost: 500, // 500 or (0/2 rangs)
    effect: '15% chance de brûlure par niveau (4 dégâts/sec pendant 4 sec)'
  }
}

// Compétences spéciales du Guerrier
export const WARRIOR_SKILLS: Record<string, SkillConfig> = {
  specialSkill1: {
    id: 'whirlwind',
    name: 'Tourbillon',
    description: 'Passif : chance de double coup',
    maxLevel: 3,
    cost: 1, // 1 SP seulement
    goldCost: 250, // 250 or (0/3 rangs)
    effect: '+10% chance de frapper deux fois par niveau'
  },
  specialSkill2: {
    id: 'devastation',
    name: 'Dévastation',
    description: 'Passif : plus de dégâts sur cibles à faible vie',
    maxLevel: 2,
    cost: 1, // 1 SP seulement
    goldCost: 500, // 500 or (0/2 rangs)
    effect: '+25% dégâts sur cibles <50% PV par niveau'
  },
  specialSkill3: {
    id: 'shieldBash',
    name: 'Coup de Bouclier',
    description: 'Passif : augmente la chance de stun',
    maxLevel: 1,
    cost: 1, // 1 SP seulement
    goldCost: 1000, // 1000 or (0/1 rang)
    effect: '+15% chance de stun (base 20%)'
  }
}

// Compétences spéciales du Mage
export const MAGE_SKILLS: Record<string, SkillConfig> = {
  specialSkill1: {
    id: 'pyromancer',
    name: 'Pyromane',
    description: 'Passif : améliore la brûlure passive',
    maxLevel: 3,
    cost: 1, // 1 SP seulement
    goldCost: 250, // 250 or (0/3 rangs)
    effect: '+1 dégâts et +1 sec de durée par niveau'
  },
  specialSkill2: {
    id: 'magicShield',
    name: 'Bouclier Magique',
    description: 'Passif : augmente la portée du mage et des alliés proches',
    maxLevel: 2,
    cost: 1, // 1 SP seulement
    goldCost: 500, // 500 or (0/2 rangs)
    effect: '+1 portée par niveau (zone d\'effet selon portée actuelle)'
  },
  specialSkill3: {
    id: 'blizzard',
    name: 'Blizzard',
    description: 'Sort actif : attaque de zone avec gel',
    maxLevel: 1,
    cost: 1, // 1 SP seulement
    goldCost: 1000, // 1000 or (0/1 rang)
    effect: 'Toutes les 3 sec : 5 dégâts x2, 4 ennemis max, 35% gel 1.5s'
  }
}

// Fonction pour obtenir toutes les compétences d'un héros
export function getHeroSkills(heroType: 'archer' | 'warrior' | 'mage'): Record<string, SkillConfig> {
  const commonSkills = { ...COMMON_SKILLS }
  
  switch (heroType) {
    case 'archer':
      return { ...commonSkills, ...ARCHER_SKILLS }
    case 'warrior':
      return { ...commonSkills, ...WARRIOR_SKILLS }
    case 'mage':
      return { ...commonSkills, ...MAGE_SKILLS }
    default:
      return commonSkills
  }
}

// Fonction pour calculer l'effet d'une compétence
export function calculateSkillEffect(skillId: string, level: number): number {
  switch (skillId) {
    case 'damageBoost':
      return level * 10 // +10% par niveau
    case 'speedBoost':
      return level * 15 // +15% par niveau
    case 'accuracyBoost':
      return level * 15 // +15% par niveau (modifié)
    case 'criticalBoost':
      return level * 8 // +8% par niveau
    case 'multiShot':
      return level // +1 cible par niveau
    case 'piercingShot':
      return level * 10 // +10% réduction vitesse par niveau
    case 'fireArrow':
      return level * 15 // +15% chance par niveau
    case 'whirlwind':
      return level * 10 // +10% chance double coup par niveau
    case 'devastation':
      return level * 25 // +25% dégâts par niveau
    case 'shieldBash':
      return 15 // +15% chance stun (fixe)
    case 'pyromancer':
      return level // +1 dégâts et +1 sec par niveau
    case 'magicShield':
      return level // +1 portée par niveau
    case 'blizzard':
      return level // Niveau du sort (pas de calcul spécifique)
    default:
      return 0
  }
}

// Configuration des compétences par classe
export interface SkillConfig {
  id: string
  name: string
  description: string
  maxLevel: number
  cost: number // Points de compétence requis par niveau
  goldCost: number // Coût en or par niveau
  effect: string // Description de l'effet
}