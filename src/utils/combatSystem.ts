import { Hero, Enemy, Position } from '../types/game'
import { HERO_TYPES } from '../data/heroTypes'
import { ENEMY_TYPES, getEnemyExperience } from '../data/enemyTypes'
import { calculateValidRangeTiles } from './rangeCalculator'
import { calculateSkillEffect } from '../data/heroSkills'

export interface AttackResult {
  hit: boolean
  damage: number
  isCritical: boolean
  targetId: string
}

export interface CombatUpdate {
  enemiesHit: AttackResult[]
  heroExperience: number
  goldEarned: number
  enemiesKilled: string[]
}

// Calculer les statistiques effectives d'un héros avec ses compétences
export function getEffectiveStats(hero: Hero) {
  const baseStats = hero.stats
  const skills = hero.skills
  
  return {
    damage: Math.floor(baseStats.damage * (1 + calculateSkillEffect('damageBoost', skills.damageBoost) / 100)),
    attackSpeed: baseStats.attackSpeed * (1 + calculateSkillEffect('speedBoost', skills.speedBoost) / 100),
    accuracy: Math.min(95, baseStats.accuracy + calculateSkillEffect('accuracyBoost', skills.accuracyBoost)),
    criticalChance: Math.min(75, baseStats.criticalChance + calculateSkillEffect('criticalBoost', skills.criticalBoost))
  }
}

// Vérifier si un ennemi est dans la portée d'un héros
export function isEnemyInRange(hero: Hero, enemy: Enemy, gridSize: number): boolean {
  const heroType = HERO_TYPES[hero.type]
  const attackConfig = { ...heroType.attackConfig }
  
  // Appliquer les compétences spéciales qui modifient la portée
  if (hero.type === 'mage' && hero.skills.specialSkill2 > 0) {
    // Bouclier Magique : augmente la portée
    const bonusRange = calculateSkillEffect('magicShield', hero.skills.specialSkill2)
    attackConfig.maxRange += bonusRange
  }
  
  const validRangeTiles = calculateValidRangeTiles(hero.position, attackConfig, gridSize)
  
  // Vérifier si la position de l'ennemi (arrondie) est dans la portée
  const enemyTileX = Math.floor(enemy.position.x)
  const enemyTileY = Math.floor(enemy.position.y)
  
  return validRangeTiles.some(tile => tile.x === enemyTileX && tile.y === enemyTileY)
}

// Trouver tous les ennemis dans la portée d'un héros
export function findEnemiesInRange(hero: Hero, enemies: Enemy[], gridSize: number): Enemy[] {
  return enemies.filter(enemy => isEnemyInRange(hero, enemy, gridSize))
}

// Calculer les dégâts d'une attaque
export function calculateDamage(hero: Hero, enemy: Enemy): { damage: number; isCritical: boolean } {
  const effectiveStats = getEffectiveStats(hero)
  let baseDamage = effectiveStats.damage
  const isCritical = Math.random() * 100 < effectiveStats.criticalChance
  
  // Appliquer les compétences spéciales
  if (hero.type === 'warrior' && hero.skills.specialSkill2 > 0) {
    // Dévastation : bonus de dégâts sur cibles à faible vie
    if (enemy.health / enemy.maxHealth < 0.5) {
      const devastationBonus = calculateSkillEffect('devastation', hero.skills.specialSkill2)
      baseDamage = Math.floor(baseDamage * (1 + devastationBonus / 100))
    }
  }
  
  const damage = isCritical ? Math.floor(baseDamage * 1.5) : baseDamage
  
  return { damage, isCritical }
}

// Vérifier si une attaque touche
export function calculateHit(hero: Hero): boolean {
  const effectiveStats = getEffectiveStats(hero)
  return Math.random() * 100 < effectiveStats.accuracy
}

// Appliquer les effets de statut
export function applyStatusEffects(hero: Hero, enemy: Enemy): Enemy {
  const updatedEnemy = { ...enemy }
  const currentTime = Date.now()
  
  // Archer - Flèche Enflammée
  if (hero.type === 'archer' && hero.skills.specialSkill3 > 0) {
    const fireChance = calculateSkillEffect('fireArrow', hero.skills.specialSkill3)
    if (Math.random() * 100 < fireChance) {
      updatedEnemy.statusEffects = {
        ...updatedEnemy.statusEffects,
        burning: {
          damage: 4,
          duration: 4000, // 4 secondes
          startTime: currentTime
        }
      }
    }
  }
  
  // Archer - Tir Perforant (ralentissement)
  if (hero.type === 'archer' && hero.skills.specialSkill2 > 0) {
    const slowReduction = calculateSkillEffect('piercingShot', hero.skills.specialSkill2)
    updatedEnemy.statusEffects = {
      ...updatedEnemy.statusEffects,
      slowed: {
        reduction: slowReduction,
        duration: 2000, // 2 secondes
        startTime: currentTime
      }
    }
  }
  
  // Guerrier - Coup de Bouclier (stun)
  if (hero.type === 'warrior' && hero.skills.specialSkill3 > 0) {
    const baseStunChance = 20 // 20% de base
    const bonusStunChance = calculateSkillEffect('shieldBash', hero.skills.specialSkill3)
    const totalStunChance = baseStunChance + bonusStunChance
    
    if (Math.random() * 100 < totalStunChance) {
      updatedEnemy.statusEffects = {
        ...updatedEnemy.statusEffects,
        stunned: {
          duration: 1000, // 1 seconde
          startTime: currentTime
        }
      }
    }
  }
  
  return updatedEnemy
}

// Exécuter une attaque d'un héros
export function executeAttack(hero: Hero, enemies: Enemy[], gridSize: number): CombatUpdate {
  const heroType = HERO_TYPES[hero.type]
  const enemiesInRange = findEnemiesInRange(hero, enemies, gridSize)
  
  if (enemiesInRange.length === 0) {
    return {
      enemiesHit: [],
      heroExperience: 0,
      goldEarned: 0,
      enemiesKilled: []
    }
  }
  
  const attackResults: AttackResult[] = []
  let totalExperience = 0
  let totalGold = 0
  const enemiesKilled: string[] = []
  
  // Déterminer les cibles selon le type d'attaque et les compétences
  let targets: Enemy[] = []
  let maxTargets = heroType.attackConfig.maxTargets || 1
  
  // Appliquer les compétences spéciales qui modifient le nombre de cibles
  if (hero.type === 'archer' && hero.skills.specialSkill1 > 0) {
    // Tir Multiple : augmente le nombre de cibles (1 de base + skill)
    const bonusTargets = calculateSkillEffect('multiShot', hero.skills.specialSkill1)
    maxTargets = Math.min(1 + bonusTargets, 4) // Max 4 cibles
  }
  
  // Trier les ennemis selon le mode de ciblage
  const sortedEnemies = [...enemiesInRange]
  if (hero.targetingMode === 'last') {
    // Cibler les dernières cibles (plus avancées sur le chemin)
    sortedEnemies.sort((a, b) => b.currentPathPosition - a.currentPathPosition)
  } else {
    // Cibler les premières cibles (moins avancées sur le chemin) - par défaut
    sortedEnemies.sort((a, b) => a.currentPathPosition - b.currentPathPosition)
  }
  
  if (heroType.attackConfig.type === 'monocible') {
    // Attaque monocible : prendre les premières cibles selon maxTargets et le mode de ciblage
    targets = sortedEnemies.slice(0, maxTargets)
  } else {
    // Attaque AOE : prendre tous les ennemis dans la portée (limité par maxTargets)
    targets = sortedEnemies.slice(0, maxTargets)
  }
  
  // Guerrier - Tourbillon (chance de double coup)
  let attackCount = 1
  if (hero.type === 'warrior' && hero.skills.specialSkill1 > 0) {
    const whirlwindChance = calculateSkillEffect('whirlwind', hero.skills.specialSkill1)
    if (Math.random() * 100 < whirlwindChance) {
      attackCount = 2 // Double coup
    }
  }
  
  // Attaquer chaque cible (potentiellement plusieurs fois)
  for (let attack = 0; attack < attackCount; attack++) {
    targets.forEach(enemy => {
      const hit = calculateHit(hero)
      
      if (hit) {
        const { damage, isCritical } = calculateDamage(hero, enemy)
        
        attackResults.push({
          hit: true,
          damage,
          isCritical,
          targetId: enemy.id
        })
        
        // +1 Or pour chaque hit (nouveau système économique)
        totalGold += 1
        
        // +1 XP pour chaque hit (nouveau système)
        totalExperience += 1
        
        // Appliquer les dégâts
        const newHealth = enemy.health - damage
        if (newHealth <= 0) {
          enemiesKilled.push(enemy.id)
          // XP selon le tier de l'ennemi
          totalExperience += getEnemyExperience(enemy.type)
          totalGold += getEnemyReward(enemy.type) // Or bonus pour tuer
        }
        
        // Appliquer les effets de statut
        applyStatusEffects(hero, enemy)
      } else {
        attackResults.push({
          hit: false,
          damage: 0,
          isCritical: false,
          targetId: enemy.id
        })
      }
    })
  }
  
  return {
    enemiesHit: attackResults,
    heroExperience: totalExperience,
    goldEarned: totalGold,
    enemiesKilled
  }
}

// Appliquer les dégâts à un ennemi
export function applyDamage(enemy: Enemy, damage: number): Enemy {
  return {
    ...enemy,
    health: Math.max(0, enemy.health - damage)
  }
}

// Calculer l'expérience requise pour le prochain niveau
export function getExperienceRequired(level: number): number {
  return level * 100 // 100 XP pour niveau 1->2, 200 pour 2->3, etc.
}

// Vérifier si un héros peut monter de niveau
export function canLevelUp(hero: Hero): boolean {
  const xpRequired = getExperienceRequired(hero.level)
  return hero.experience >= xpRequired && hero.level < 10 // Niveau max 10
}

// Faire monter un héros de niveau
export function levelUpHero(hero: Hero): Hero {
  if (!canLevelUp(hero)) return hero
  
  const xpRequired = getExperienceRequired(hero.level)
  
  // Gains automatiques par niveau
  const statGains = {
    damage: Math.floor(hero.stats.damage * 0.15), // +15% dégâts
    attackSpeed: hero.stats.attackSpeed * 0.1, // +10% vitesse
    accuracy: Math.min(95, hero.stats.accuracy + 3), // +3% précision
    criticalChance: Math.min(50, hero.stats.criticalChance + 2) // +2% critique
  }
  
  return {
    ...hero,
    level: hero.level + 1,
    experience: hero.experience - xpRequired,
    skillPoints: hero.skillPoints + 1, // +1 point de compétence par niveau
    stats: {
      damage: hero.stats.damage + statGains.damage,
      attackSpeed: hero.stats.attackSpeed + statGains.attackSpeed,
      accuracy: statGains.accuracy,
      criticalChance: statGains.criticalChance
    }
  }
}

// Obtenir la récompense d'un ennemi
export function getEnemyReward(enemyType: string): number {
  return ENEMY_TYPES[enemyType]?.reward || 5
}

// Créer un effet visuel d'attaque
export interface AttackEffect {
  id: string
  heroId: string
  heroType: 'archer' | 'warrior' | 'mage'
  startPosition: Position
  targetPosition: Position
  timestamp: number
  duration: number
}

export function createAttackEffect(
  hero: Hero, 
  targetPosition: Position
): AttackEffect {
  return {
    id: `effect_${Date.now()}_${Math.random()}`,
    heroId: hero.id,
    heroType: hero.type,
    startPosition: { ...hero.position },
    targetPosition: { ...targetPosition },
    timestamp: Date.now(),
    duration: hero.type === 'archer' ? 300 : hero.type === 'warrior' ? 200 : 400 // Durée en ms
  }
}

// Créer un texte de dégâts flottant
export interface DamageText {
  id: string
  damage: number
  position: Position
  isCritical: boolean
  timestamp: number
  duration: number
}

export function createDamageText(
  damage: number,
  position: Position,
  isCritical: boolean
): DamageText {
  return {
    id: `damage_${Date.now()}_${Math.random()}`,
    damage,
    position: { ...position },
    isCritical,
    timestamp: Date.now(),
    duration: 1500 // 1.5 secondes
  }
}

// Traiter les effets de statut des ennemis
export function processStatusEffects(enemies: Enemy[]): Enemy[] {
  const currentTime = Date.now()
  
  return enemies.map(enemy => {
    if (!enemy.statusEffects) return enemy
    
    const updatedEnemy = { ...enemy }
    const statusEffects = { ...enemy.statusEffects }
    
    // Traiter la brûlure
    if (statusEffects.burning) {
      const elapsed = currentTime - statusEffects.burning.startTime
      if (elapsed >= statusEffects.burning.duration) {
        delete statusEffects.burning
      } else {
        // Appliquer les dégâts de brûlure (toutes les secondes)
        const burnTicks = Math.floor(elapsed / 1000)
        const lastBurnTick = Math.floor((elapsed - 50) / 1000) // 50ms de tolérance
        if (burnTicks > lastBurnTick) {
          updatedEnemy.health = Math.max(0, updatedEnemy.health - statusEffects.burning.damage)
        }
      }
    }
    
    // Traiter le ralentissement
    if (statusEffects.slowed) {
      const elapsed = currentTime - statusEffects.slowed.startTime
      if (elapsed >= statusEffects.slowed.duration) {
        delete statusEffects.slowed
      }
    }
    
    // Traiter le stun
    if (statusEffects.stunned) {
      const elapsed = currentTime - statusEffects.stunned.startTime
      if (elapsed >= statusEffects.stunned.duration) {
        delete statusEffects.stunned
      }
    }
    
    // Traiter le gel
    if (statusEffects.frozen) {
      const elapsed = currentTime - statusEffects.frozen.startTime
      if (elapsed >= statusEffects.frozen.duration) {
        delete statusEffects.frozen
      }
    }
    
    updatedEnemy.statusEffects = Object.keys(statusEffects).length > 0 ? statusEffects : undefined
    
    return updatedEnemy
  })
}