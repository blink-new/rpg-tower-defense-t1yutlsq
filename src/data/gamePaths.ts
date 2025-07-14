import { Position } from '../types/game'

// Chemin simplifié mais suffisamment long
export const GAME_PATH: Position[] = [
  // Entrée par la gauche
  { x: 0, y: 5 },
  { x: 1, y: 5 },
  { x: 2, y: 5 },
  { x: 3, y: 5 },
  // Premier virage vers le haut
  { x: 3, y: 4 },
  { x: 3, y: 3 },
  { x: 3, y: 2 },
  // Virage vers la droite
  { x: 4, y: 2 },
  { x: 5, y: 2 },
  { x: 6, y: 2 },
  // Virage vers le bas
  { x: 6, y: 3 },
  { x: 6, y: 4 },
  { x: 6, y: 5 },
  { x: 6, y: 6 },
  { x: 6, y: 7 },
  { x: 6, y: 8 },
  // Virage final vers la droite
  { x: 7, y: 8 },
  { x: 8, y: 8 },
  { x: 9, y: 8 },
  { x: 10, y: 8 }
]

// Tous les chemins disponibles (pour l'instant un seul)
export const GAME_PATHS = [GAME_PATH]

// Toutes les cases de chemin
export const ALL_PATH_TILES: Position[] = [...GAME_PATH]

// Fonction utilitaire pour obtenir un chemin aléatoire
export function getRandomPath(): Position[] {
  return GAME_PATHS[Math.floor(Math.random() * GAME_PATHS.length)]
}

// Fonction utilitaire pour obtenir le point de spawn d'un chemin
export function getPathSpawnPoint(pathIndex: number): Position {
  return GAME_PATHS[pathIndex][0]
}

// Fonction utilitaire pour obtenir le chemin complet par index
export function getPathByIndex(pathIndex: number): Position[] {
  return GAME_PATHS[pathIndex] || GAME_PATHS[0]
}