import { Position, AttackConfig } from '../types/game'

export function calculateValidRangeTiles(
  heroPos: Position,
  attackConfig: AttackConfig,
  gridSize: number = 11
): Position[] {
  const validTiles: Position[] = []
  const { minRange, maxRange, shape } = attackConfig

  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      // Éviter la position du héros lui-même
      if (x === heroPos.x && y === heroPos.y) continue

      const manhattanDistance = Math.abs(x - heroPos.x) + Math.abs(y - heroPos.y)
      const chebyshevDistance = Math.max(Math.abs(x - heroPos.x), Math.abs(y - heroPos.y))
      
      // Pour la forme diamond, on utilise uniquement la distance de Manhattan
      // et on vérifie que la distance est exactement dans la plage min-max
      if (shape === 'diamond' || shape === 'diamant') {
        // Pour un losange, on veut une distance de Manhattan exacte
        if (manhattanDistance >= minRange && manhattanDistance <= maxRange) {
          validTiles.push({ x, y })
        }
      } else {
        // Pour les autres formes, utiliser la logique existante
        let distance: number
        if (shape === 'carré') {
          distance = chebyshevDistance
        } else {
          distance = manhattanDistance
        }
        
        if (distance >= minRange && distance <= maxRange) {
          if (isInAttackShape(heroPos, { x, y }, shape)) {
            validTiles.push({ x, y })
          }
        }
      }
    }
  }

  return validTiles
}

function isInAttackShape(
  heroPos: Position,
  targetPos: Position,
  shape: 'croix' | 'carré' | 'ligne' | 'cross' | 'diamond' | 'diamant'
): boolean {
  const dx = Math.abs(targetPos.x - heroPos.x)
  const dy = Math.abs(targetPos.y - heroPos.y)

  switch (shape) {
    case 'diamond':
    case 'diamant':
      // Forme en losange : distance de Manhattan exacte (pas de plage, juste la distance exacte)
      // Cette forme sera utilisée avec minRange = maxRange pour une distance fixe
      return true // La distance est déjà filtrée dans calculateValidRangeTiles
    
    case 'cross':
      // Forme en croix (X) : diagonales uniquement
      return dx === dy && dx > 0
    
    case 'croix':
      // Forme en croix (+) : même ligne ou même colonne
      return targetPos.x === heroPos.x || targetPos.y === heroPos.y
    
    case 'carré':
      // Forme carrée : dans un carré autour du héros (distance déjà filtrée)
      return true
    
    case 'ligne':
      // Forme en ligne : seulement en ligne droite (horizontale ou verticale)
      return (targetPos.x === heroPos.x && dy > 0) || (targetPos.y === heroPos.y && dx > 0)
    
    default:
      return false
  }
}

export function getAOEAffectedTiles(
  targetPos: Position,
  aoeRadius: number,
  gridSize: number = 11
): Position[] {
  const affectedTiles: Position[] = []

  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      const distance = Math.abs(x - targetPos.x) + Math.abs(y - targetPos.y)
      if (distance <= aoeRadius) {
        affectedTiles.push({ x, y })
      }
    }
  }

  return affectedTiles
}