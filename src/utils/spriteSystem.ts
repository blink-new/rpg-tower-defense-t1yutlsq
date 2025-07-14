import React from 'react'
import { Enemy } from '../types/game'

// Système de sprites simple utilisant des formes CSS au lieu d'emojis
export interface SpriteConfig {
  backgroundColor: string
  borderColor: string
  shape: 'circle' | 'square' | 'diamond' | 'triangle'
  size: number
  icon?: string // Emoji de fallback si nécessaire
}

// Configuration des sprites pour les héros
export const HERO_SPRITES: Record<'archer' | 'warrior' | 'mage', SpriteConfig> = {
  archer: {
    backgroundColor: '#22c55e',
    borderColor: '#16a34a',
    shape: 'triangle',
    size: 24,
    icon: '🏹'
  },
  warrior: {
    backgroundColor: '#ef4444',
    borderColor: '#dc2626',
    shape: 'square',
    size: 26,
    icon: '⚔️'
  },
  mage: {
    backgroundColor: '#8b5cf6',
    borderColor: '#7c3aed',
    shape: 'circle',
    size: 25,
    icon: '🔮'
  }
}

// Configuration des sprites pour les ennemis
export const ENEMY_SPRITES: Record<string, SpriteConfig> = {
  goblin: {
    backgroundColor: '#65a30d',
    borderColor: '#4d7c0f',
    shape: 'circle',
    size: 18,
    icon: '👹'
  },
  orc: {
    backgroundColor: '#dc2626',
    borderColor: '#991b1b',
    shape: 'square',
    size: 20,
    icon: '👺'
  },
  troll: {
    backgroundColor: '#7c2d12',
    borderColor: '#581c87',
    shape: 'square',
    size: 22,
    icon: '🧌'
  },
  ogre: {
    backgroundColor: '#4c1d95',
    borderColor: '#312e81',
    shape: 'square',
    size: 24,
    icon: '👹'
  },
  demon: {
    backgroundColor: '#7f1d1d',
    borderColor: '#450a0a',
    shape: 'diamond',
    size: 26,
    icon: '😈'
  },
  dragon: {
    backgroundColor: '#b91c1c',
    borderColor: '#7f1d1d',
    shape: 'diamond',
    size: 28,
    icon: '🐉'
  }
}

// Générer le style CSS pour un sprite
export function generateSpriteStyle(config: SpriteConfig): React.CSSProperties {
  const baseStyle: React.CSSProperties = {
    width: `${config.size}px`,
    height: `${config.size}px`,
    backgroundColor: config.backgroundColor,
    border: `2px solid ${config.borderColor}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 'bold',
    color: 'white',
    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
    transition: 'transform 0.1s ease'
  }

  switch (config.shape) {
    case 'circle':
      return {
        ...baseStyle,
        borderRadius: '50%'
      }
    case 'diamond':
      return {
        ...baseStyle,
        transform: 'rotate(45deg)',
        borderRadius: '4px'
      }
    case 'triangle':
      return {
        ...baseStyle,
        clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
        border: 'none',
        boxShadow: `inset 0 0 0 2px ${config.borderColor}, 0 2px 4px rgba(0,0,0,0.3)`
      }
    case 'square':
    default:
      return {
        ...baseStyle,
        borderRadius: '4px'
      }
  }
}

// Fonction pour obtenir la configuration de sprite d'un ennemi
export function getEnemySpriteConfig(enemyType: string): SpriteConfig {
  return ENEMY_SPRITES[enemyType] || ENEMY_SPRITES.goblin
}

// Fonction pour obtenir la configuration de sprite d'un héros
export function getHeroSpriteConfig(heroType: 'archer' | 'warrior' | 'mage'): SpriteConfig {
  return HERO_SPRITES[heroType]
}