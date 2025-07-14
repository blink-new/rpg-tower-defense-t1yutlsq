import { Enemy, Position } from '../types/game'

export interface AnimationState {
  isRunning: boolean
  lastFrameTime: number
  animationId: number | null
}

export interface SmoothEnemy extends Enemy {
  renderPosition: Position // Position de rendu interpolée
  targetPosition: Position // Position cible pour l'interpolation
  velocity: { x: number; y: number } // Vitesse actuelle
}

// Créer un état d'animation initial
export function createAnimationState(): AnimationState {
  return {
    isRunning: false,
    lastFrameTime: 0,
    animationId: null
  }
}

// Convertir un ennemi normal en ennemi avec animation fluide
export function createSmoothEnemy(enemy: Enemy): SmoothEnemy {
  return {
    ...enemy,
    renderPosition: { ...enemy.position },
    targetPosition: { ...enemy.position },
    velocity: { x: 0, y: 0 }
  }
}

// Interpoler la position d'un ennemi pour un rendu fluide
export function interpolateEnemyPosition(
  enemy: SmoothEnemy, 
  deltaTime: number,
  gameSpeed: number
): SmoothEnemy {
  const dt = deltaTime / 1000 // Convertir en secondes
  const speedMultiplier = gameSpeed
  
  // Calculer la distance vers la cible
  const dx = enemy.targetPosition.x - enemy.renderPosition.x
  const dy = enemy.targetPosition.y - enemy.renderPosition.y
  const distance = Math.sqrt(dx * dx + dy * dy)
  
  // Si on est très proche de la cible, s'y téléporter
  if (distance < 0.01) {
    return {
      ...enemy,
      renderPosition: { ...enemy.targetPosition },
      velocity: { x: 0, y: 0 }
    }
  }
  
  // Calculer la vitesse nécessaire pour atteindre la cible
  const moveSpeed = enemy.speed * speedMultiplier * 2 // Facteur de vitesse pour le rendu
  const directionX = dx / distance
  const directionY = dy / distance
  
  // Calculer la nouvelle position
  const moveDistance = Math.min(moveSpeed * dt, distance)
  const newX = enemy.renderPosition.x + directionX * moveDistance
  const newY = enemy.renderPosition.y + directionY * moveDistance
  
  return {
    ...enemy,
    renderPosition: { x: newX, y: newY },
    velocity: { 
      x: directionX * moveSpeed, 
      y: directionY * moveSpeed 
    }
  }
}

// Mettre à jour la position cible d'un ennemi
export function updateEnemyTarget(enemy: SmoothEnemy, newTarget: Position): SmoothEnemy {
  return {
    ...enemy,
    targetPosition: { ...newTarget },
    position: { ...newTarget } // Mettre à jour aussi la position logique
  }
}

// Créer un effet de spawn avec animation
export interface SpawnEffect {
  id: string
  position: Position
  timestamp: number
  duration: number
  type: 'spawn' | 'death'
}

export function createSpawnEffect(position: Position, type: 'spawn' | 'death' = 'spawn'): SpawnEffect {
  return {
    id: `effect_${Date.now()}_${Math.random()}`,
    position: { ...position },
    timestamp: Date.now(),
    duration: type === 'spawn' ? 500 : 800, // 500ms pour spawn, 800ms pour mort
    type
  }
}

// Calculer l'opacité d'un effet selon son âge
export function calculateEffectOpacity(effect: SpawnEffect, currentTime: number): number {
  const elapsed = currentTime - effect.timestamp
  const progress = elapsed / effect.duration
  
  if (progress >= 1) return 0
  
  if (effect.type === 'spawn') {
    // Fade in rapide puis stable
    return Math.min(1, progress * 3)
  } else {
    // Fade out progressif
    return Math.max(0, 1 - progress)
  }
}

// Calculer l'échelle d'un effet selon son âge
export function calculateEffectScale(effect: SpawnEffect, currentTime: number): number {
  const elapsed = currentTime - effect.timestamp
  const progress = elapsed / effect.duration
  
  if (progress >= 1) return 1
  
  if (effect.type === 'spawn') {
    // Grossit rapidement puis se stabilise
    return 0.5 + (progress * 0.5)
  } else {
    // Rétrécit progressivement
    return 1 - (progress * 0.3)
  }
}

// Système de particules simple pour les effets visuels
export interface Particle {
  id: string
  position: Position
  velocity: { x: number; y: number }
  life: number
  maxLife: number
  color: string
  size: number
}

export function createAttackParticles(
  startPos: Position, 
  endPos: Position, 
  heroType: 'archer' | 'warrior' | 'mage'
): Particle[] {
  const particles: Particle[] = []
  const particleCount = heroType === 'mage' ? 8 : heroType === 'warrior' ? 5 : 3
  
  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5
    const speed = 0.5 + Math.random() * 0.5
    
    particles.push({
      id: `particle_${Date.now()}_${i}`,
      position: { ...endPos },
      velocity: {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed
      },
      life: 300 + Math.random() * 200, // 300-500ms
      maxLife: 300 + Math.random() * 200,
      color: heroType === 'mage' ? '#ff4444' : heroType === 'archer' ? '#ffaa00' : '#cccccc',
      size: 2 + Math.random() * 2
    })
  }
  
  return particles
}

export function updateParticles(particles: Particle[], deltaTime: number): Particle[] {
  return particles
    .map(particle => ({
      ...particle,
      position: {
        x: particle.position.x + particle.velocity.x * deltaTime / 100,
        y: particle.position.y + particle.velocity.y * deltaTime / 100
      },
      life: particle.life - deltaTime,
      velocity: {
        x: particle.velocity.x * 0.98, // Friction
        y: particle.velocity.y * 0.98
      }
    }))
    .filter(particle => particle.life > 0)
}

// Fonction utilitaire pour calculer le deltaTime
export function calculateDeltaTime(currentTime: number, lastTime: number): number {
  return Math.min(currentTime - lastTime, 16.67) // Cap à 60 FPS
}