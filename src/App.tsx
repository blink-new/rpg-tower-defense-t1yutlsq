import { useState, useCallback, useEffect, useRef } from 'react'
import { Button } from './components/ui/button'
import { Card } from './components/ui/card'
import { Badge } from './components/ui/badge'
import { Play, Pause, RotateCcw, Zap, Info, Star, DollarSign, AlertTriangle } from 'lucide-react'
import { HeroInfoDialog } from './components/HeroInfoDialog'
import { HeroSkillsDialog } from './components/HeroSkillsDialog'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './components/ui/alert-dialog'
import { getHeroSkills } from './data/heroSkills'
import { GameState, Hero, Position, Enemy, AttackEffect, DamageText } from './types/game'
import { HERO_TYPES } from './data/heroTypes'
import { ALL_PATH_TILES } from './data/gamePaths'
import { calculateValidRangeTiles } from './utils/rangeCalculator'
import { 
  executeAttack, 
  applyDamage, 
  levelUpHero, 
  canLevelUp,
  createAttackEffect,
  createDamageText,
  getExperienceRequired,
  getEffectiveStats,
  processStatusEffects
} from './utils/combatSystem'
import { 
  startWave, 
  createEnemy, 
  moveEnemyAlongPath, 
  getEnemyEmoji, 
  getEnemyReward,
  calculateWaveBonus
} from './utils/waveManager'
import { 
  createAnimationState, 
  createSmoothEnemy, 
  interpolateEnemyPosition, 
  updateEnemyTarget,
  createSpawnEffect,
  calculateEffectOpacity,
  calculateEffectScale,
  createAttackParticles,
  updateParticles,
  calculateDeltaTime,
  type SmoothEnemy,
  type SpawnEffect,
  type Particle,
  type AnimationState
} from './utils/animationSystem'

// Game configuration
const GRID_SIZE = 11

function App() {
  const [gameState, setGameState] = useState<GameState>({
    gold: 150,
    lives: 20,
    wave: 1,
    isPlaying: false,
    gameSpeed: 1,
    heroes: [],
    enemies: [],
    selectedHeroType: null,
    selectedHero: null,
    showHeroInfo: null,
    showRangePreview: false,
    mousePosition: null,
    waveInProgress: false,
    enemySpawnQueue: [],
    nextSpawnTime: 0,
    attackEffects: [],
    damageTexts: [],
    lastAttackTime: {}
  })

  // États pour le système d'animation fluide
  const [smoothEnemies, setSmoothEnemies] = useState<SmoothEnemy[]>([])
  const [spawnEffects, setSpawnEffects] = useState<SpawnEffect[]>([])
  const [particles, setParticles] = useState<Particle[]>([])
  const animationState = useRef<AnimationState>(createAnimationState())
  const [gameOver, setGameOver] = useState(false)
  const [showNextWaveButton, setShowNextWaveButton] = useState(false)

  const [showSkillsDialog, setShowSkillsDialog] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)

  // Check if a position is on the path
  const isPathTile = useCallback((x: number, y: number): boolean => {
    return ALL_PATH_TILES.some(pos => pos.x === x && pos.y === y)
  }, [])

  // Check if a position has a hero
  const getHeroAt = useCallback((x: number, y: number): Hero | null => {
    return gameState.heroes.find(hero => hero.position.x === x && hero.position.y === y) || null
  }, [gameState.heroes])

  // Calculate valid range tiles for preview
  const getValidRangeTiles = useCallback((): Position[] => {
    // Pour un nouveau héros en placement
    if (gameState.selectedHeroType && gameState.mousePosition) {
      const heroType = HERO_TYPES[gameState.selectedHeroType]
      return calculateValidRangeTiles(gameState.mousePosition, heroType.attackConfig, GRID_SIZE)
    }

    // Pour un héros existant sélectionné
    if (gameState.selectedHero && gameState.showRangePreview) {
      const heroType = HERO_TYPES[gameState.selectedHero.type]
      return calculateValidRangeTiles(gameState.selectedHero.position, heroType.attackConfig, GRID_SIZE)
    }

    return []
  }, [gameState.selectedHeroType, gameState.mousePosition, gameState.selectedHero, gameState.showRangePreview])

  // Check if placement is valid
  const isValidPlacement = useCallback((x: number, y: number): boolean => {
    return !isPathTile(x, y) && !getHeroAt(x, y)
  }, [isPathTile, getHeroAt])

  // Place a hero on the grid
  const placeHero = useCallback((x: number, y: number) => {
    if (!gameState.selectedHeroType || !isValidPlacement(x, y)) {
      return
    }

    const heroType = HERO_TYPES[gameState.selectedHeroType]
    if (gameState.gold < heroType.cost) {
      return
    }

    const newHero: Hero = {
      id: `hero_${Date.now()}`,
      type: gameState.selectedHeroType,
      position: { x, y },
      level: 1,
      experience: 0,
      skillPoints: 0,
      stats: { ...heroType.baseStats },
      skills: {
        damageBoost: 0,
        speedBoost: 0,
        accuracyBoost: 0,
        criticalBoost: 0,
        specialSkill1: 0,
        specialSkill2: 0,
        specialSkill3: 0
      },
      lockedSpecialSkills: [],
      targetingMode: 'first'
    }

    setGameState(prev => ({
      ...prev,
      heroes: [...prev.heroes, newHero],
      gold: prev.gold - heroType.cost,
      selectedHeroType: null,
      showRangePreview: false
    }))
  }, [gameState.selectedHeroType, gameState.gold, isValidPlacement])

  // Calculer le prix de revente d'un héros
  const calculateSellPrice = useCallback((hero: Hero): number => {
    const heroType = HERO_TYPES[hero.type]
    let totalInvestment = heroType.cost
    
    // Ajouter le coût des compétences
    const heroSkills = getHeroSkills(hero.type)
    Object.entries(hero.skills).forEach(([skillId, level]) => {
      const skillConfig = Object.values(heroSkills).find(skill => 
        skill.id === skillId || skillId.includes(skill.id)
      )
      if (skillConfig && level > 0) {
        totalInvestment += skillConfig.goldCost * level
      }
    })
    
    return Math.floor(totalInvestment * 0.4) // 40% du prix total
  }, [])

  // Sell hero function
  const sellHero = useCallback((heroId: string) => {
    setGameState(prev => {
      const heroIndex = prev.heroes.findIndex(h => h.id === heroId)
      if (heroIndex === -1) return prev

      const hero = prev.heroes[heroIndex]
      const sellPrice = calculateSellPrice(hero)

      const updatedHeroes = [...prev.heroes]
      updatedHeroes.splice(heroIndex, 1)

      return {
        ...prev,
        heroes: updatedHeroes,
        gold: prev.gold + sellPrice,
        selectedHero: prev.selectedHero?.id === heroId ? null : prev.selectedHero,
        showRangePreview: prev.selectedHero?.id === heroId ? false : prev.showRangePreview
      }
    })
  }, [calculateSellPrice])

  // Reset game function
  const resetGame = useCallback(() => {
    setGameState({
      gold: 150,
      lives: 20,
      wave: 1,
      isPlaying: false,
      gameSpeed: 1,
      heroes: [],
      enemies: [],
      selectedHeroType: null,
      selectedHero: null,
      showHeroInfo: null,
      showRangePreview: false,
      mousePosition: null,
      waveInProgress: false,
      enemySpawnQueue: [],
      nextSpawnTime: 0,
      attackEffects: [],
      damageTexts: [],
      lastAttackTime: {}
    })
    setSmoothEnemies([])
    setSpawnEffects([])
    setParticles([])
    setGameOver(false)
    setShowNextWaveButton(false)
    setShowResetDialog(false)
  }, [])

  // Start next wave manually
  const startNextWave = useCallback(() => {
    setGameState(prev => {
      if (prev.waveInProgress || prev.enemies.length > 0) return prev
      
      const nextWaveData = startWave(prev.wave)
      return {
        ...prev,
        waveInProgress: true,
        enemySpawnQueue: nextWaveData.enemySpawnQueue,
        nextSpawnTime: Date.now() + nextWaveData.spawnDelay
      }
    })
    setShowNextWaveButton(false)
  }, [])

  // Upgrade hero skill
  const upgradeHeroSkill = useCallback((skillId: string) => {
    if (!gameState.selectedHero) return

    setGameState(prev => {
      const heroIndex = prev.heroes.findIndex(h => h.id === prev.selectedHero!.id)
      if (heroIndex === -1) return prev

      const hero = prev.heroes[heroIndex]
      const currentLevel = (hero.skills as any)[skillId] || 0
      
      const heroSkills = getHeroSkills(hero.type)
      const skillConfig = Object.values(heroSkills).find(skill => 
        skill.id === skillId || skillId.includes(skill.id)
      )
      
      if (!skillConfig) return prev
      
      if (hero.skillPoints < skillConfig.cost || 
          prev.gold < skillConfig.goldCost || 
          currentLevel >= skillConfig.maxLevel) {
        return prev
      }

      const updatedHeroes = [...prev.heroes]
      updatedHeroes[heroIndex] = {
        ...hero,
        skillPoints: hero.skillPoints - skillConfig.cost,
        skills: {
          ...hero.skills,
          [skillId]: currentLevel + 1
        }
      }

      return {
        ...prev,
        heroes: updatedHeroes,
        selectedHero: updatedHeroes[heroIndex],
        gold: prev.gold - skillConfig.goldCost
      }
    })
  }, [gameState.selectedHero])

  // Toggle targeting mode
  const toggleTargetingMode = useCallback(() => {
    if (!gameState.selectedHero) return

    setGameState(prev => {
      const heroIndex = prev.heroes.findIndex(h => h.id === prev.selectedHero!.id)
      if (heroIndex === -1) return prev

      const updatedHeroes = [...prev.heroes]
      const currentMode = updatedHeroes[heroIndex].targetingMode
      updatedHeroes[heroIndex] = {
        ...updatedHeroes[heroIndex],
        targetingMode: currentMode === 'first' ? 'last' : 'first'
      }

      return {
        ...prev,
        heroes: updatedHeroes,
        selectedHero: updatedHeroes[heroIndex]
      }
    })
  }, [gameState.selectedHero])

  // Select hero type for placement
  const selectHeroType = useCallback((type: 'archer' | 'warrior' | 'mage') => {
    setGameState(prev => ({
      ...prev,
      selectedHeroType: prev.selectedHeroType === type ? null : type,
      selectedHero: null,
      showRangePreview: prev.selectedHeroType === type ? false : true,
      mousePosition: null
    }))
  }, [])

  // Show hero info dialog
  const showHeroInfo = useCallback((type: 'archer' | 'warrior' | 'mage') => {
    setGameState(prev => ({
      ...prev,
      showHeroInfo: type
    }))
  }, [])

  // Close hero info dialog
  const closeHeroInfo = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      showHeroInfo: null
    }))
  }, [])

  // Show range preview
  const showRangePreview = useCallback(() => {
    if (gameState.showHeroInfo) {
      setGameState(prev => ({
        ...prev,
        selectedHeroType: prev.showHeroInfo,
        showHeroInfo: null,
        showRangePreview: true
      }))
    }
  }, [gameState.showHeroInfo])

  // Buy hero from info dialog
  const buyHeroFromDialog = useCallback(() => {
    if (gameState.showHeroInfo) {
      setGameState(prev => ({
        ...prev,
        selectedHeroType: prev.showHeroInfo,
        showHeroInfo: null,
        showRangePreview: true
      }))
    }
  }, [gameState.showHeroInfo])

  // Select existing hero for upgrades
  const selectHero = useCallback((hero: Hero) => {
    setGameState(prev => {
      const isSameHero = prev.selectedHero?.id === hero.id
      return {
        ...prev,
        selectedHero: isSameHero ? null : hero,
        selectedHeroType: null,
        showRangePreview: !isSameHero,
        mousePosition: isSameHero ? null : hero.position
      }
    })
  }, [])

  // Show skills dialog
  const showSkillsDialogForHero = useCallback(() => {
    if (gameState.selectedHero) {
      setShowSkillsDialog(true)
    }
  }, [gameState.selectedHero])

  // Toggle game play/pause
  const togglePlay = useCallback(() => {
    setGameState(prev => {
      const newIsPlaying = !prev.isPlaying
      
      if (newIsPlaying && !prev.waveInProgress && prev.enemies.length === 0) {
        const waveData = startWave(prev.wave)
        
        return {
          ...prev,
          isPlaying: newIsPlaying,
          waveInProgress: true,
          enemySpawnQueue: waveData.enemySpawnQueue,
          nextSpawnTime: Date.now() + waveData.spawnDelay
        }
      }
      
      return { ...prev, isPlaying: newIsPlaying }
    })
  }, [])

  // Change game speed
  const changeSpeed = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      gameSpeed: prev.gameSpeed === 1 ? 2 : 1
    }))
  }, [])

  // Handle mouse movement for range preview
  const handleMouseMove = useCallback((x: number, y: number) => {
    if (gameState.selectedHeroType && gameState.showRangePreview) {
      setGameState(prev => ({
        ...prev,
        mousePosition: { x, y }
      }))
    }
  }, [gameState.selectedHeroType, gameState.showRangePreview])

  // Système d'animation fluide avec requestAnimationFrame
  useEffect(() => {
    if (!gameState.isPlaying) return

    const currentAnimationState = animationState.current

    const animate = (currentTime: number) => {
      if (!currentAnimationState.isRunning) return

      const deltaTime = calculateDeltaTime(currentTime, currentAnimationState.lastFrameTime)
      currentAnimationState.lastFrameTime = currentTime

      // Mettre à jour les ennemis fluides
      setSmoothEnemies(prev => 
        prev.map(enemy => interpolateEnemyPosition(enemy, deltaTime, gameState.gameSpeed))
      )

      // Mettre à jour les particules
      setParticles(prev => updateParticles(prev, deltaTime))

      // Nettoyer les effets expirés
      setSpawnEffects(prev => 
        prev.filter(effect => currentTime - effect.timestamp < effect.duration)
      )

      currentAnimationState.animationId = requestAnimationFrame(animate)
    }

    currentAnimationState.isRunning = true
    currentAnimationState.lastFrameTime = performance.now()
    currentAnimationState.animationId = requestAnimationFrame(animate)

    return () => {
      currentAnimationState.isRunning = false
      if (currentAnimationState.animationId) {
        cancelAnimationFrame(currentAnimationState.animationId)
      }
    }
  }, [gameState.isPlaying, gameState.gameSpeed])

  // Combat system - Heroes attack enemies
  useEffect(() => {
    if (!gameState.isPlaying || gameState.enemies.length === 0) return

    const combatLoop = setInterval(() => {
      const currentTime = Date.now()
      
      setGameState(prev => {
        const newState = { ...prev }
        let updatedEnemies = [...prev.enemies]
        const updatedHeroes = [...prev.heroes]
        let newAttackEffects = [...prev.attackEffects]
        let newDamageTexts = [...prev.damageTexts]
        let goldEarned = 0

        prev.heroes.forEach(hero => {
          const effectiveStats = getEffectiveStats(hero)
          const attackCooldown = 1000 / effectiveStats.attackSpeed
          const lastAttack = prev.lastAttackTime[hero.id] || 0
          
          if (currentTime - lastAttack >= attackCooldown) {
            const combatResult = executeAttack(hero, updatedEnemies, GRID_SIZE)
            
            if (combatResult.enemiesHit.length > 0) {
              newState.lastAttackTime = {
                ...newState.lastAttackTime,
                [hero.id]: currentTime
              }
              
              goldEarned += combatResult.goldEarned
              
              combatResult.enemiesHit.forEach(attackResult => {
                if (attackResult.hit) {
                  const enemyIndex = updatedEnemies.findIndex(e => e.id === attackResult.targetId)
                  if (enemyIndex !== -1) {
                    const enemy = updatedEnemies[enemyIndex]
                    updatedEnemies[enemyIndex] = applyDamage(enemy, attackResult.damage)
                    
                    const attackEffect = createAttackEffect(hero, enemy.position)
                    newAttackEffects.push(attackEffect)
                    
                    const damageText = createDamageText(
                      attackResult.damage,
                      enemy.position,
                      attackResult.isCritical
                    )
                    newDamageTexts.push(damageText)

                    // Créer des particules d'attaque
                    const newParticles = createAttackParticles(hero.position, enemy.position, hero.type)
                    setParticles(prevParticles => [...prevParticles, ...newParticles])
                  }
                } else {
                  // Ajouter un texte "Raté" pour les attaques ratées
                  const enemyIndex = updatedEnemies.findIndex(e => e.id === attackResult.targetId)
                  if (enemyIndex !== -1) {
                    const enemy = updatedEnemies[enemyIndex]
                    const missText = {
                      id: `miss_${Date.now()}_${Math.random()}`,
                      damage: 0,
                      position: { ...enemy.position },
                      isCritical: false,
                      timestamp: Date.now(),
                      duration: 1000,
                      isMiss: true
                    }
                    newDamageTexts.push(missText as any)
                  }
                }
              })
              
              const aliveEnemies = updatedEnemies.filter(enemy => enemy.health > 0)
              updatedEnemies = aliveEnemies
              
              const heroIndex = updatedHeroes.findIndex(h => h.id === hero.id)
              if (heroIndex !== -1) {
                let updatedHero = {
                  ...updatedHeroes[heroIndex],
                  experience: updatedHeroes[heroIndex].experience + combatResult.heroExperience
                }
                
                if (canLevelUp(updatedHero)) {
                  updatedHero = levelUpHero(updatedHero)
                }
                
                updatedHeroes[heroIndex] = updatedHero
              }
            }
          }
        })

        newAttackEffects = newAttackEffects.filter(effect => 
          currentTime - effect.timestamp < effect.duration
        )
        newDamageTexts = newDamageTexts.filter(text => 
          currentTime - text.timestamp < text.duration
        )

        return {
          ...newState,
          enemies: updatedEnemies,
          heroes: updatedHeroes,
          attackEffects: newAttackEffects,
          damageTexts: newDamageTexts,
          gold: newState.gold + goldEarned
        }
      })
    }, 50)

    return () => clearInterval(combatLoop)
  }, [gameState.isPlaying, gameState.enemies.length, gameState.heroes.length])

  // Game loop pour gérer les ennemis
  useEffect(() => {
    if (!gameState.isPlaying) return

    const gameLoop = setInterval(() => {
      const currentTime = Date.now()
      
      setGameState(prev => {
        let newState = { ...prev }
        
        let updatedEnemies = processStatusEffects(prev.enemies)
        
        // Spawn des ennemis
        if (prev.waveInProgress && prev.enemySpawnQueue.length > 0 && currentTime >= prev.nextSpawnTime) {
          const nextEnemy = prev.enemySpawnQueue[0]
          const enemyId = `enemy_${currentTime}_${Math.random()}`
          
          try {
            const newEnemy = createEnemy(nextEnemy.enemyType, nextEnemy.pathIndex, enemyId)
            
            updatedEnemies = [...updatedEnemies, newEnemy]
            
            // Créer un ennemi fluide et l'ajouter
            const smoothEnemy = createSmoothEnemy(newEnemy)
            setSmoothEnemies(prev => [...prev, smoothEnemy])
            
            // Créer un effet de spawn
            const spawnEffect = createSpawnEffect(newEnemy.position, 'spawn')
            setSpawnEffects(prev => [...prev, spawnEffect])
            
            newState = {
              ...newState,
              enemySpawnQueue: prev.enemySpawnQueue.slice(1),
              nextSpawnTime: prev.enemySpawnQueue.length > 1 ? currentTime + (1500 / prev.gameSpeed) : 0
            }
          } catch (error) {
            console.error('Error creating enemy:', error)
            newState.enemySpawnQueue = prev.enemySpawnQueue.slice(1)
          }
        }
        
        // Mouvement des ennemis
        updatedEnemies = updatedEnemies.map(enemy => {
          const isStunned = enemy.statusEffects?.stunned
          const isFrozen = enemy.statusEffects?.frozen
          
          if (isStunned || isFrozen) {
            return enemy
          }
          
          let effectiveSpeed = enemy.speed
          if (enemy.statusEffects?.slowed) {
            const reduction = enemy.statusEffects.slowed.reduction
            effectiveSpeed = enemy.speed * (1 - reduction / 100)
          }
          
          const moveResult = moveEnemyAlongPath(enemy, 50 * prev.gameSpeed, effectiveSpeed)
          
          if (moveResult.hasReachedEnd) {
            newState.lives = Math.max(0, newState.lives - 1)
            
            // Supprimer l'ennemi fluide correspondant
            setSmoothEnemies(prevSmooth => 
              prevSmooth.filter(smoothEnemy => smoothEnemy.id !== enemy.id)
            )
            
            return null
          }
          
          // Mettre à jour la position cible de l'ennemi fluide
          setSmoothEnemies(prevSmooth => 
            prevSmooth.map(smoothEnemy => 
              smoothEnemy.id === enemy.id 
                ? updateEnemyTarget(smoothEnemy, moveResult.newPosition)
                : smoothEnemy
            )
          )
          
          return {
            ...enemy,
            position: moveResult.newPosition,
            currentPathPosition: moveResult.newPathPosition
          }
        }).filter(enemy => enemy !== null) as Enemy[]
        
        newState.enemies = updatedEnemies
        
        // Vérifier si la vague est terminée
        if (prev.waveInProgress && prev.enemySpawnQueue.length === 0 && updatedEnemies.length === 0) {
          const waveBonus = calculateWaveBonus(prev.wave)
          newState.waveInProgress = false
          newState.wave = prev.wave + 1
          newState.gold = newState.gold + waveBonus
          newState.isPlaying = false // Pause le jeu après chaque vague
          setShowNextWaveButton(true) // Afficher le bouton pour la prochaine vague
        }
        
        // Gérer le game over
        if (newState.lives === 0 && !gameOver) {
          setGameOver(true)
          newState.isPlaying = false
          setSmoothEnemies([])
          setSpawnEffects([])
          setParticles([])
        }
        
        return newState
      })
    }, 50)

    return () => clearInterval(gameLoop)
  }, [gameState.isPlaying, gameState.gameSpeed, gameOver])

  // Get valid range tiles for current mouse position
  const validRangeTiles = getValidRangeTiles()

  // Render grid tile
  const renderTile = (x: number, y: number) => {
    const isPath = isPathTile(x, y)
    const hero = getHeroAt(x, y)
    const key = `${x}-${y}`
    const isValidForPlacement = isValidPlacement(x, y)
    const isInRange = validRangeTiles.some(pos => pos.x === x && pos.y === y)
    const isMousePosition = gameState.mousePosition?.x === x && gameState.mousePosition?.y === y

    let tileClasses = `tile ${isPath ? 'tile-path' : 'tile-grass'}`

    const shouldShowRange = (gameState.showRangePreview && gameState.selectedHeroType) || (gameState.selectedHero && gameState.showRangePreview)

    if (shouldShowRange && isInRange) {
      if (gameState.selectedHeroType) {
        if (isValidForPlacement) {
          tileClasses += ' tile-range-valid'
        } else {
          tileClasses += ' tile-range-invalid'
        }
      } else {
        tileClasses += ' tile-range-valid'
      }
    }

    if (gameState.selectedHeroType && isMousePosition && isValidForPlacement) {
      tileClasses += ' tile-ghost-preview'
    }

    return (
      <div
        key={key}
        className={tileClasses}
        onClick={() => !isPath && !hero && placeHero(x, y)}
        onMouseEnter={() => handleMouseMove(x, y)}
      >
        {/* Hero fantôme pour l'aperçu */}
        {gameState.showRangePreview &&
         gameState.selectedHeroType &&
         isMousePosition &&
         isValidForPlacement && (
          <div className="hero-ghost">
            {HERO_TYPES[gameState.selectedHeroType].emoji}
          </div>
        )}

        {/* Ennemis avec positions fluides */}
        {smoothEnemies
          .filter(e => {
            const enemyTileX = Math.floor(e.renderPosition.x)
            const enemyTileY = Math.floor(e.renderPosition.y)
            return enemyTileX === x && enemyTileY === y
          })
          .map(enemy => {
            const offsetX = (enemy.renderPosition.x - Math.floor(enemy.renderPosition.x)) * 100
            const offsetY = (enemy.renderPosition.y - Math.floor(enemy.renderPosition.y)) * 100
            
            return (
              <div 
                key={enemy.id}
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                style={{
                  transform: `translate(${offsetX}%, ${offsetY}%)`,
                  transition: 'none' // Pas de transition CSS, on gère avec requestAnimationFrame
                }}
              >
                <div className="relative">
                  <div className="text-2xl drop-shadow-lg">{getEnemyEmoji(enemy.type)}</div>
                  
                  {/* Indicateurs d'effets de statut */}
                  <div className="absolute -top-2 -right-2 flex gap-1">
                    {enemy.statusEffects?.burning && (
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" title="Brûlure">🔥</div>
                    )}
                    {enemy.statusEffects?.slowed && (
                      <div className="w-3 h-3 bg-blue-400 rounded-full" title="Ralenti">❄️</div>
                    )}
                    {enemy.statusEffects?.stunned && (
                      <div className="w-3 h-3 bg-yellow-500 rounded-full animate-bounce" title="Étourdi">⭐</div>
                    )}
                    {enemy.statusEffects?.frozen && (
                      <div className="w-3 h-3 bg-cyan-400 rounded-full" title="Gelé">🧊</div>
                    )}
                  </div>
                  
                  {/* Barre de vie rouge avec nombre de PV */}
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-1.5 bg-red-900 rounded-full border border-red-700">
                    <div 
                      className="h-full bg-red-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(0, (enemy.health / enemy.maxHealth) * 100)}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold" style={{ fontSize: '8px' }}>
                      {enemy.health}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

        {/* Effets de spawn */}
        {spawnEffects
          .filter(effect => Math.floor(effect.position.x) === x && Math.floor(effect.position.y) === y)
          .map(effect => {
            const currentTime = Date.now()
            const opacity = calculateEffectOpacity(effect, currentTime)
            const scale = calculateEffectScale(effect, currentTime)
            
            return (
              <div
                key={effect.id}
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-15"
                style={{
                  opacity,
                  transform: `scale(${scale})`,
                  transition: 'none'
                }}
              >
                <div className="w-8 h-8 bg-yellow-400 rounded-full animate-pulse" />
              </div>
            )
          })}

        {/* Particules */}
        {particles
          .filter(particle => {
            const particleTileX = Math.floor(particle.position.x)
            const particleTileY = Math.floor(particle.position.y)
            return particleTileX === x && particleTileY === y
          })
          .map(particle => {
            const offsetX = (particle.position.x - Math.floor(particle.position.x)) * 100
            const offsetY = (particle.position.y - Math.floor(particle.position.y)) * 100
            const opacity = particle.life / particle.maxLife
            
            return (
              <div
                key={particle.id}
                className="absolute pointer-events-none z-20"
                style={{
                  left: `${offsetX}%`,
                  top: `${offsetY}%`,
                  width: `${particle.size}px`,
                  height: `${particle.size}px`,
                  backgroundColor: particle.color,
                  borderRadius: '50%',
                  opacity,
                  transform: 'translate(-50%, -50%)'
                }}
              />
            )
          })}
        
        {/* Hero placé */}
        {hero && (
          <div
            className={`hero hero-${hero.type} ${gameState.selectedHero?.id === hero.id ? 'ring-2 ring-accent' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              selectHero(hero)
            }}
          >
            {HERO_TYPES[hero.type].emoji}
            {hero.level > 1 && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full text-xs flex items-center justify-center text-black font-bold">
                {hero.level}
              </div>
            )}
          </div>
        )}
        
        {/* Textes de dégâts flottants */}
        {gameState.damageTexts
          .filter(text => Math.floor(text.position.x) === x && Math.floor(text.position.y) === y)
          .map(text => {
            const elapsed = Date.now() - text.timestamp
            const progress = elapsed / text.duration
            const opacity = Math.max(0, 1 - progress)
            const yOffset = -progress * 30
            
            return (
              <div
                key={text.id}
                className={`absolute inset-0 flex items-center justify-center pointer-events-none z-20 font-bold text-sm ${
                  (text as any).isMiss ? 'text-gray-400' : text.isCritical ? 'text-yellow-400' : 'text-red-500'
                }`}
                style={{
                  opacity,
                  transform: `translateY(${yOffset}px)`,
                  textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
                }}
              >
                {(text as any).isMiss ? 'Raté' : text.isCritical ? `CRIT ${text.damage}!` : text.damage}
              </div>
            )
          })}

        {/* Effets d'attaque améliorés */}
        {gameState.attackEffects
          .filter(effect => 
            (Math.floor(effect.startPosition.x) === x && Math.floor(effect.startPosition.y) === y) ||
            (Math.floor(effect.targetPosition.x) === x && Math.floor(effect.targetPosition.y) === y)
          )
          .map(effect => {
            const elapsed = Date.now() - effect.timestamp
            const progress = elapsed / effect.duration
            
            if (progress >= 1) return null
            
            if (effect.heroType === 'archer') {
              // Animation de flèche qui vole de l'archer vers la cible
              const startTileX = Math.floor(effect.startPosition.x)
              const startTileY = Math.floor(effect.startPosition.y)
              const endTileX = Math.floor(effect.targetPosition.x)
              const endTileY = Math.floor(effect.targetPosition.y)
              
              // Calculer la position actuelle de la flèche
              const currentTileX = startTileX + (endTileX - startTileX) * progress
              const currentTileY = startTileY + (endTileY - startTileY) * progress
              
              // Afficher la flèche seulement sur la case où elle se trouve actuellement
              if (Math.floor(currentTileX) === x && Math.floor(currentTileY) === y) {
                const offsetX = (currentTileX - Math.floor(currentTileX)) * 100
                const offsetY = (currentTileY - Math.floor(currentTileY)) * 100
                
                return (
                  <div
                    key={effect.id}
                    className="absolute pointer-events-none z-15 text-yellow-600"
                    style={{
                      left: `${offsetX}%`,
                      top: `${offsetY}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    ➤
                  </div>
                )
              }
            } else if (effect.heroType === 'warrior') {
              return (
                <div
                  key={effect.id}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none z-15"
                  style={{ 
                    opacity: 1 - progress,
                    transform: `rotate(${progress * 360}deg)`
                  }}
                >
                  <div className="text-2xl text-gray-300">⚔️</div>
                </div>
              )
            } else if (effect.heroType === 'mage') {
              return (
                <div
                  key={effect.id}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none z-15"
                  style={{ 
                    opacity: 1 - progress,
                    transform: `scale(${1 + progress * 0.5})`
                  }}
                >
                  <div className="text-2xl animate-pulse">🔥</div>
                </div>
              )
            }
            
            return null
          })}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-4xl font-bold text-primary mb-2">Ultimate Defense Reborn</h1>
          <p className="text-muted-foreground">Défendez votre royaume avec des héros RPG !</p>
          {gameOver && (
            <div className="mt-4 p-4 bg-destructive/20 border border-destructive rounded-lg">
              <h2 className="text-2xl font-bold text-destructive mb-2">GAME OVER</h2>
              <p className="text-muted-foreground">Vos défenses ont été submergées ! Cliquez sur Reset pour recommencer.</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Game Board */}
          <div className="lg:col-span-3">
            <Card className="p-6">
              <div className="game-grid mx-auto max-w-2xl">
                {Array.from({ length: GRID_SIZE }, (_, y) =>
                  Array.from({ length: GRID_SIZE }, (_, x) => renderTile(x, y))
                )}
              </div>
            </Card>
          </div>

          {/* UI Panel */}
          <div className="space-y-4">
            {/* Game Stats */}
            <Card className="p-4">
              <h3 className="font-bold mb-3">Ressources</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Or:</span>
                  <Badge variant="secondary" className="bg-accent text-black">
                    {gameState.gold}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Vies:</span>
                  <Badge variant={gameState.lives <= 5 ? "destructive" : "default"}>
                    {gameState.lives}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Vague:</span>
                  <Badge variant="outline">{gameState.wave}</Badge>
                </div>
                {gameState.waveInProgress && (
                  <div className="flex justify-between">
                    <span>Ennemis:</span>
                    <Badge variant="secondary">
                      {gameState.enemies.length + gameState.enemySpawnQueue.length}
                    </Badge>
                  </div>
                )}
              </div>
            </Card>

            {/* Game Controls */}
            <Card className="p-4">
              <h3 className="font-bold mb-3">Contrôles</h3>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button
                    onClick={togglePlay}
                    variant={gameState.isPlaying ? "destructive" : "default"}
                    size="sm"
                    className="flex-1"
                    disabled={gameOver}
                  >
                    {gameState.isPlaying ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                    {gameState.isPlaying ? 'Pause' : 'Play'}
                  </Button>
                  <Button
                    onClick={changeSpeed}
                    variant="outline"
                    size="sm"
                    disabled={!gameState.isPlaying}
                  >
                    <Zap className="w-4 h-4 mr-1" />
                    {gameState.gameSpeed}x
                  </Button>
                </div>
                
                {showNextWaveButton && (
                  <Button
                    onClick={startNextWave}
                    variant="default"
                    size="sm"
                    className="w-full"
                  >
                    Vague suivante ({gameState.wave})
                  </Button>
                )}

                <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full">
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Reset
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Recommencer la partie ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action va remettre à zéro tous vos progrès. Êtes-vous sûr de vouloir continuer ?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={resetGame}>
                        Recommencer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </Card>

            {/* Hero Selection */}
            <Card className="p-4">
              <h3 className="font-bold mb-3">Héros disponibles</h3>
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(HERO_TYPES).map(([type, heroType]) => (
                  <div key={type} className="flex items-center gap-2">
                    <Button
                      onClick={() => selectHeroType(type as 'archer' | 'warrior' | 'mage')}
                      variant={gameState.selectedHeroType === type ? "default" : "outline"}
                      size="sm"
                      className="flex-1"
                      disabled={gameState.gold < heroType.cost}
                    >
                      <span className="mr-2">{heroType.emoji}</span>
                      {heroType.name} ({heroType.cost}💰)
                    </Button>
                    <Button
                      onClick={() => showHeroInfo(type as 'archer' | 'warrior' | 'mage')}
                      variant="ghost"
                      size="sm"
                    >
                      <Info className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>

            {/* Selected Hero Info */}
            {gameState.selectedHero && (
              <Card className="p-4">
                <h3 className="font-bold mb-3">Héros sélectionné</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{HERO_TYPES[gameState.selectedHero.type].emoji}</span>
                    <div>
                      <div className="font-semibold">{HERO_TYPES[gameState.selectedHero.type].name}</div>
                      <div className="text-sm text-muted-foreground">
                        Niveau {gameState.selectedHero.level} • {gameState.selectedHero.experience}/{getExperienceRequired(gameState.selectedHero.level)} XP
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Points de compétence:</span>
                      <Badge variant="secondary">{gameState.selectedHero.skillPoints}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Mode de ciblage:</span>
                      <Button
                        onClick={toggleTargetingMode}
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-xs"
                      >
                        {gameState.selectedHero.targetingMode === 'first' ? 'Premier' : 'Dernier'}
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={showSkillsDialogForHero}
                      variant="default"
                      size="sm"
                      className="flex-1"
                      disabled={gameState.selectedHero.skillPoints === 0}
                    >
                      <Star className="w-4 h-4 mr-1" />
                      Compétences
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <DollarSign className="w-4 h-4 mr-1" />
                          Vendre
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Vendre ce héros ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Vous recevrez {calculateSellPrice(gameState.selectedHero)} pièces d'or (40% de l'investissement total).
                            Cette action est irréversible.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => sellHero(gameState.selectedHero!.id)}>
                            Vendre
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Hero Info Dialog */}
        {gameState.showHeroInfo && (
          <HeroInfoDialog
            heroType={gameState.showHeroInfo}
            isOpen={!!gameState.showHeroInfo}
            onClose={closeHeroInfo}
            onShowRange={showRangePreview}
            onBuy={buyHeroFromDialog}
            canAfford={gameState.gold >= HERO_TYPES[gameState.showHeroInfo].cost}
          />
        )}

        {/* Hero Skills Dialog */}
        {gameState.selectedHero && (
          <HeroSkillsDialog
            hero={gameState.selectedHero}
            isOpen={showSkillsDialog}
            onClose={() => setShowSkillsDialog(false)}
            onUpgrade={upgradeHeroSkill}
            currentGold={gameState.gold}
          />
        )}
      </div>
    </div>
  )
}

export default App