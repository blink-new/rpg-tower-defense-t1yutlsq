export interface Position {
  x: number
  y: number
}

export interface AttackConfig {
  type: 'monocible' | 'AOE'
  shape: 'croix' | 'carré' | 'ligne' | 'cross' | 'diamond'
  minRange: number
  maxRange: number
  aoeRadius?: number
  maxTargets?: number // Nombre maximum de cibles touchées
}

export interface HeroType {
  id: 'archer' | 'warrior' | 'mage'
  name: string
  emoji: string
  cost: number
  description: string
  specialEffect: string
  baseStats: {
    damage: number
    attackSpeed: number
    accuracy: number
    criticalChance: number
  }
  attackConfig: AttackConfig
}

export interface Hero {
  id: string
  type: 'archer' | 'warrior' | 'mage'
  position: Position
  level: number
  experience: number
  skillPoints: number
  stats: {
    damage: number
    attackSpeed: number
    accuracy: number
    criticalChance: number
  }
  skills: HeroSkills // Nouvelles compétences
  lockedSpecialSkills: string[] // Compétences spéciales verrouillées
  targetingMode: 'first' | 'last' // Mode de ciblage : premières ou dernières cibles
}

// Nouvelles compétences pour les héros
export interface HeroSkills {
  // Compétences communes
  damageBoost: number      // +% dégâts
  speedBoost: number       // +% vitesse d'attaque
  accuracyBoost: number    // +% précision
  criticalBoost: number    // +% chance critique
  
  // Compétences spéciales par classe
  specialSkill1: number    // Compétence spéciale 1
  specialSkill2: number    // Compétence spéciale 2
  specialSkill3: number    // Compétence spéciale 3
}

// Configuration des compétences par classe
export interface SkillConfig {
  id: string
  name: string
  description: string
  maxLevel: number
  cost: number // Points de compétence requis par niveau
  effect: string // Description de l'effet
}

export interface EnemyType {
  id: string
  name: string
  emoji: string
  health: number
  speed: number
  reward: number
}

export interface Enemy {
  id: string
  type: string
  position: Position
  health: number
  maxHealth: number
  speed: number
  pathIndex: number // Index du chemin suivi (0 ou 1)
  currentPathPosition: number // Position actuelle sur le chemin
  path: Position[] // Le chemin complet que suit cet ennemi
  statusEffects?: {
    burning?: { damage: number; duration: number; startTime: number }
    slowed?: { reduction: number; duration: number; startTime: number }
    stunned?: { duration: number; startTime: number }
    frozen?: { duration: number; startTime: number }
  }
}

export interface GameState {
  gold: number
  lives: number
  wave: number
  isPlaying: boolean
  gameSpeed: number
  heroes: Hero[]
  enemies: Enemy[]
  selectedHeroType: 'archer' | 'warrior' | 'mage' | null
  selectedHero: Hero | null
  showHeroInfo: 'archer' | 'warrior' | 'mage' | null
  showRangePreview: boolean
  mousePosition: Position | null
  waveInProgress: boolean
  enemySpawnQueue: Array<{ enemyType: string, pathIndex: number }>
  nextSpawnTime: number
  attackEffects: AttackEffect[]
  damageTexts: DamageText[]
  lastAttackTime: Record<string, number> // heroId -> timestamp
}

export interface AttackEffect {
  id: string
  heroId: string
  heroType: 'archer' | 'warrior' | 'mage'
  startPosition: Position
  targetPosition: Position
  timestamp: number
  duration: number
}

export interface DamageText {
  id: string
  damage: number
  position: Position
  isCritical: boolean
  timestamp: number
  duration: number
}

export interface PathNode {
  x: number
  y: number
  direction?: 'up' | 'down' | 'left' | 'right'
}