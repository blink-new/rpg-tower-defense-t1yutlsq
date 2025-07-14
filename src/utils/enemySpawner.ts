import { Enemy } from '../types/game'
import { ENEMY_TYPES, getEnemyTypeForWave } from '../data/enemyTypes'
import { GAME_PATHS, getPathByIndex } from '../data/gamePaths'

export interface WaveConfig {
  waveNumber: number
  enemyTypes: string[]
  spawnDelay: number // Délai entre chaque spawn en ms
  waveDelay: number // Délai avant la prochaine vague en ms
}

export interface SpawnerState {
  currentWave: number
  isSpawning: boolean
  enemyQueue: Array<{ enemyType: string, pathIndex: number }>
  nextSpawnTime: number
  waveCompleted: boolean
  allEnemiesSpawned: boolean
}

// Créer la configuration d'une vague
export function createWaveConfig(waveNumber: number): WaveConfig {
  const enemyCount = Math.min(5 + waveNumber * 2, 25) // Maximum 25 ennemis
  const enemyTypes: string[] = []
  
  // Générer les types d'ennemis pour cette vague
  for (let i = 0; i < enemyCount; i++) {
    const enemyType = getEnemyTypeForWave(waveNumber)
    enemyTypes.push(enemyType)
  }
  
  return {
    waveNumber,
    enemyTypes,
    spawnDelay: Math.max(300, 1500 - waveNumber * 50), // Délai diminue avec les vagues
    waveDelay: 3000 // 3 secondes entre les vagues
  }
}

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

// Initialiser le spawner pour une nouvelle vague
export function initializeWaveSpawner(waveNumber: number): SpawnerState {
  const waveConfig = createWaveConfig(waveNumber)
  const enemyQueue: Array<{ enemyType: string, pathIndex: number }> = []
  
  // Créer la queue d'ennemis
  waveConfig.enemyTypes.forEach(enemyType => {
    const pathIndex = Math.floor(Math.random() * GAME_PATHS.length)
    enemyQueue.push({ enemyType, pathIndex })
  })
  
  return {
    currentWave: waveNumber,
    isSpawning: true,
    enemyQueue,
    nextSpawnTime: Date.now() + waveConfig.spawnDelay,
    waveCompleted: false,
    allEnemiesSpawned: false
  }
}

// Traiter le spawn des ennemis
export function processEnemySpawning(
  spawnerState: SpawnerState,
  currentTime: number,
  gameSpeed: number
): {
  newEnemy: Enemy | null
  updatedSpawnerState: SpawnerState
} {
  if (!spawnerState.isSpawning || spawnerState.enemyQueue.length === 0) {
    return {
      newEnemy: null,
      updatedSpawnerState: {
        ...spawnerState,
        allEnemiesSpawned: spawnerState.enemyQueue.length === 0
      }
    }
  }
  
  // Vérifier s'il est temps de spawn le prochain ennemi
  if (currentTime < spawnerState.nextSpawnTime) {
    return {
      newEnemy: null,
      updatedSpawnerState: spawnerState
    }
  }
  
  // Spawn le prochain ennemi
  const nextEnemyData = spawnerState.enemyQueue[0]
  const enemyId = `enemy_${currentTime}_${Math.random()}`
  
  try {
    const newEnemy = createEnemy(nextEnemyData.enemyType, nextEnemyData.pathIndex, enemyId)
    
    const remainingQueue = spawnerState.enemyQueue.slice(1)
    const waveConfig = createWaveConfig(spawnerState.currentWave)
    
    return {
      newEnemy,
      updatedSpawnerState: {
        ...spawnerState,
        enemyQueue: remainingQueue,
        nextSpawnTime: remainingQueue.length > 0 
          ? currentTime + (waveConfig.spawnDelay / gameSpeed)
          : 0,
        allEnemiesSpawned: remainingQueue.length === 0
      }
    }
  } catch (error) {
    console.error('Error creating enemy:', error)
    
    return {
      newEnemy: null,
      updatedSpawnerState: {
        ...spawnerState,
        enemyQueue: spawnerState.enemyQueue.slice(1)
      }
    }
  }
}

// Vérifier si la vague est terminée
export function isWaveComplete(
  spawnerState: SpawnerState,
  aliveEnemiesCount: number
): boolean {
  return spawnerState.allEnemiesSpawned && aliveEnemiesCount === 0
}

// Calculer le bonus d'or de fin de vague
export function calculateWaveBonus(waveNumber: number): number {
  return 25 + (waveNumber * 3) // 25 + 3 par vague réussie
}