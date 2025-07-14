import { Enemy, Position } from '../types/game'
import { ENEMY_TYPES, getEnemyTypeForWave } from '../data/enemyTypes'
import { GAME_PATHS, getPathByIndex } from '../data/gamePaths'

// Configuration des vagues prédéfinies
export const WAVE_CONFIGS = [
  // Vague 1
  ['goblin', 'goblin', 'goblin', 'goblin', 'goblin'],
  // Vague 2
  ['goblin', 'goblin', 'orc', 'goblin', 'goblin', 'orc'],
  // Vague 3
  ['goblin', 'orc', 'goblin', 'orc', 'goblin', 'orc', 'goblin'],
  // Vague 4
  ['orc', 'orc', 'goblin', 'orc', 'troll', 'orc', 'goblin', 'orc'],
  // Vague 5
  ['orc', 'troll', 'orc', 'orc', 'troll', 'orc', 'troll', 'orc', 'orc'],
  // Vague 6
  ['troll', 'orc', 'troll', 'troll', 'orc', 'troll', 'ogre', 'troll', 'orc', 'troll'],
  // Vague 7
  ['troll', 'troll', 'ogre', 'troll', 'ogre', 'troll', 'ogre', 'troll', 'troll', 'ogre'],
  // Vague 8
  ['ogre', 'troll', 'ogre', 'ogre', 'troll', 'ogre', 'ogre', 'troll', 'ogre', 'ogre', 'troll'],
  // Vague 9
  ['ogre', 'ogre', 'ogre', 'demon', 'ogre', 'ogre', 'demon', 'ogre', 'ogre', 'ogre', 'demon'],
  // Vague 10 - Boss
  ['demon', 'ogre', 'demon', 'demon', 'ogre', 'demon', 'dragon', 'demon', 'ogre', 'demon', 'demon', 'dragon']
]

// Créer un nouvel ennemi
export function createEnemy(
  enemyType: string,
  pathIndex: number,
  enemyId: string
): Enemy {
  const type = ENEMY_TYPES[enemyType]
  if (!type) {
    throw new Error(`Unknown enemy type: ${enemyType}`)
  }

  const path = getPathByIndex(pathIndex)
  const startPosition = path[0]

  return {
    id: enemyId,
    type: enemyType,
    position: { ...startPosition },
    health: type.health,
    maxHealth: type.health,
    speed: type.speed,
    pathIndex,
    currentPathPosition: 0,
    path: [...path]
  }
}

// Démarrer une nouvelle vague
export function startWave(waveNumber: number): {
  enemySpawnQueue: Array<{ enemyType: string, pathIndex: number }>
  spawnDelay: number
} {
  // Utiliser la configuration prédéfinie ou générer dynamiquement pour les vagues > 10
  let enemyTypes: string[]
  
  if (waveNumber <= WAVE_CONFIGS.length) {
    enemyTypes = [...WAVE_CONFIGS[waveNumber - 1]]
  } else {
    // Génération dynamique pour les vagues avancées
    const enemyCount = Math.min(8 + waveNumber, 20) // Maximum 20 ennemis
    enemyTypes = []
    
    for (let i = 0; i < enemyCount; i++) {
      const enemyType = getEnemyTypeForWave(waveNumber)
      enemyTypes.push(enemyType)
    }
  }
  
  const spawnQueue: Array<{ enemyType: string, pathIndex: number }> = []
  
  enemyTypes.forEach(enemyType => {
    const pathIndex = 0 // Utiliser toujours le même chemin pour simplifier
    spawnQueue.push({ enemyType, pathIndex })
  })
  
  return {
    enemySpawnQueue: spawnQueue,
    spawnDelay: 1500 // 1.5 secondes entre chaque spawn
  }
}

// Faire avancer un ennemi sur son chemin
export function moveEnemyAlongPath(enemy: Enemy, deltaTime: number, effectiveSpeed?: number): {
  newPosition: Position
  newPathPosition: number
  hasReachedEnd: boolean
} {
  const path = enemy.path
  const currentIndex = Math.floor(enemy.currentPathPosition)
  const speed = effectiveSpeed !== undefined ? effectiveSpeed : enemy.speed
  
  // Si l'ennemi a atteint la fin du chemin
  if (currentIndex >= path.length - 1) {
    return {
      newPosition: enemy.position,
      newPathPosition: enemy.currentPathPosition,
      hasReachedEnd: true
    }
  }

  // Calculer la distance à parcourir (en cases par seconde)
  const distanceToMove = (speed * deltaTime) / 1000 / 100 // Convertir en cases par seconde
  
  // Position actuelle et prochaine cible
  const currentTarget = path[currentIndex]
  const nextTarget = path[currentIndex + 1]
  
  // Calculer la direction vers la prochaine case
  const dx = nextTarget.x - currentTarget.x
  const dy = nextTarget.y - currentTarget.y
  const distance = Math.sqrt(dx * dx + dy * dy)
  
  // Si la distance est très petite, passer à la case suivante
  if (distance < 0.01) {
    return {
      newPosition: { ...nextTarget },
      newPathPosition: currentIndex + 1,
      hasReachedEnd: currentIndex + 1 >= path.length - 1
    }
  }
  
  // Normaliser la direction
  const dirX = dx / distance
  const dirY = dy / distance
  
  // Calculer la nouvelle position
  const newX = enemy.position.x + dirX * distanceToMove
  const newY = enemy.position.y + dirY * distanceToMove
  
  // Vérifier si on a atteint ou dépassé la prochaine case
  const distanceToNext = Math.sqrt(
    (newX - nextTarget.x) * (newX - nextTarget.x) + 
    (newY - nextTarget.y) * (newY - nextTarget.y)
  )
  
  // Si on a atteint la prochaine case (avec une tolérance)
  if (distanceToNext < 0.05) {
    return {
      newPosition: { ...nextTarget },
      newPathPosition: currentIndex + 1,
      hasReachedEnd: currentIndex + 1 >= path.length - 1
    }
  }
  
  // Vérifier si on a dépassé la cible (pour éviter les oscillations)
  const progressToNext = Math.sqrt(
    (newX - currentTarget.x) * (newX - currentTarget.x) + 
    (newY - currentTarget.y) * (newY - currentTarget.y)
  )
  
  if (progressToNext >= distance) {
    // On a dépassé la cible, aller directement à la prochaine case
    return {
      newPosition: { ...nextTarget },
      newPathPosition: currentIndex + 1,
      hasReachedEnd: currentIndex + 1 >= path.length - 1
    }
  }
  
  return {
    newPosition: { x: newX, y: newY },
    newPathPosition: enemy.currentPathPosition,
    hasReachedEnd: false
  }
}

// Obtenir l'emoji d'un ennemi
export function getEnemyEmoji(enemyType: string): string {
  return ENEMY_TYPES[enemyType]?.emoji || '❓'
}

// Obtenir la récompense d'un ennemi
export function getEnemyReward(enemyType: string): number {
  return ENEMY_TYPES[enemyType]?.reward || 1
}

// Obtenir le nom d'un ennemi
export function getEnemyName(enemyType: string): string {
  return ENEMY_TYPES[enemyType]?.name || 'Inconnu'
}

// Calculer le bonus d'or de fin de vague
export function calculateWaveBonus(waveNumber: number): number {
  return 25 + (waveNumber * 3) // 25 + 3 par vague réussie
}