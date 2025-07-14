import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { Plus, Lock } from 'lucide-react'
import { Hero, SkillConfig } from '../types/game'
import { getHeroSkills, calculateSkillEffect } from '../data/heroSkills'
import { getExperienceRequired, getEffectiveStats } from '../utils/combatSystem'
import { HERO_TYPES } from '../data/heroTypes'

interface HeroSkillsDialogProps {
  hero: Hero | null
  isOpen: boolean
  onClose: () => void
  onUpgradeSkill: (skillId: string) => void
  gold: number
  onToggleTargeting: () => void
}

export function HeroSkillsDialog({ 
  hero, 
  isOpen, 
  onClose, 
  onUpgradeSkill, 
  gold, 
  onToggleTargeting 
}: HeroSkillsDialogProps) {
  if (!hero) return null

  const heroSkills = getHeroSkills(hero.type)
  const xpRequired = getExperienceRequired(hero.level)
  const xpProgress = (hero.experience / xpRequired) * 100

  // Vérifier combien de compétences spéciales ont été améliorées
  const specialSkillsUpgraded = [
    hero.skills.specialSkill1 > 0 ? 'specialSkill1' : null,
    hero.skills.specialSkill2 > 0 ? 'specialSkill2' : null,
    hero.skills.specialSkill3 > 0 ? 'specialSkill3' : null
  ].filter(Boolean).length

  const canUpgradeSkill = (skill: SkillConfig, currentLevel: number, skillId: string) => {
    // Vérifier les points de compétence, le coût en or et le niveau max
    if (hero.skillPoints < skill.cost || gold < skill.goldCost || currentLevel >= skill.maxLevel) {
      return false
    }
    
    // Vérifier les restrictions pour les compétences spéciales
    if (skillId.startsWith('specialSkill')) {
      // Si cette compétence n'a jamais été améliorée
      if (currentLevel === 0) {
        // Si déjà 2 compétences spéciales améliorées, bloquer
        if (specialSkillsUpgraded >= 2) {
          return false
        }
      }
    }
    
    return true
  }

  const isSkillLocked = (skillId: string, currentLevel: number): boolean => {
    if (!skillId.startsWith('specialSkill')) return false
    if (currentLevel > 0) return false // Déjà améliorée
    return specialSkillsUpgraded >= 2
  }

  const getSkillCurrentLevel = (skillId: string): number => {
    switch (skillId) {
      case 'damageBoost':
        return hero.skills.damageBoost
      case 'speedBoost':
        return hero.skills.speedBoost
      case 'accuracyBoost':
        return hero.skills.accuracyBoost
      case 'criticalBoost':
        return hero.skills.criticalBoost
      case 'specialSkill1':
        return hero.skills.specialSkill1
      case 'specialSkill2':
        return hero.skills.specialSkill2
      case 'specialSkill3':
        return hero.skills.specialSkill3
      default:
        return 0
    }
  }

  const renderSkillCard = (skillId: string, skill: SkillConfig) => {
    const currentLevel = getSkillCurrentLevel(skillId)
    const canUpgrade = canUpgradeSkill(skill, currentLevel, skillId)
    const isLocked = isSkillLocked(skillId, currentLevel)
    const effectValue = calculateSkillEffect(skillId, currentLevel)
    const nextEffectValue = calculateSkillEffect(skillId, currentLevel + 1)

    return (
      <div key={skillId} className={`p-3 border rounded-lg ${isLocked ? 'bg-muted/30 opacity-60' : 'bg-card/50'}`}>
        <div className="flex justify-between items-start mb-2">
          <div>
            <h4 className={`font-semibold text-sm flex items-center gap-2 ${isLocked ? 'text-muted-foreground' : ''}`}>
              {skill.name}
              {isLocked && <Lock className="w-3 h-3" />}
            </h4>
            <p className="text-xs text-muted-foreground">{skill.description}</p>
          </div>
          <Badge variant={currentLevel > 0 ? "default" : "outline"}>
            {currentLevel}/{skill.maxLevel}
          </Badge>
        </div>
        
        <div className="text-xs text-muted-foreground mb-2">
          {skill.effect}
        </div>
        
        {currentLevel > 0 && (
          <div className="text-xs text-accent mb-2">
            Effet actuel: {effectValue > 0 ? `+${effectValue}` : effectValue}
            {skillId.includes('Boost') ? '%' : ''}
          </div>
        )}
        
        {isLocked && currentLevel === 0 && (
          <div className="text-xs text-destructive mb-2">
            🔒 Verrouillé : Vous ne pouvez améliorer que 2 compétences spéciales sur 3
          </div>
        )}
        
        {currentLevel < skill.maxLevel && !isLocked && (
          <div className="flex justify-between items-center">
            <div className="text-xs text-primary">
              Prochain niveau: +{nextEffectValue - effectValue}
              {skillId.includes('Boost') ? '%' : ''}
            </div>
            <Button
              size="sm"
              variant={canUpgrade ? "default" : "outline"}
              disabled={!canUpgrade}
              onClick={() => onUpgradeSkill(skillId)}
              className="h-6 px-2"
            >
              <Plus className="w-3 h-3 mr-1" />
              {skill.cost}SP{skill.goldCost > 0 ? ` + ${skill.goldCost}g` : ''}
            </Button>
          </div>
        )}
        
        {currentLevel === skill.maxLevel && (
          <Badge variant="secondary" className="w-full justify-center">
            Maîtrisé
          </Badge>
        )}
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-2xl">
              {hero.type === 'archer' ? '🏹' : hero.type === 'warrior' ? '⚔️' : '🔮'}
            </span>
            <div>
              <div className="text-xl">
                {hero.type === 'archer' ? 'Archer' : hero.type === 'warrior' ? 'Guerrier' : 'Mage'}
                <Badge className="ml-2">Niveau {hero.level}</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Points de compétence: {hero.skillPoints}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Progression XP */}
          <div className="p-3 border rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Expérience</span>
              <span className="text-sm text-muted-foreground">
                {hero.experience} / {xpRequired} XP
              </span>
            </div>
            <Progress value={xpProgress} className="h-2" />
            {hero.level < 10 && (
              <div className="text-xs text-muted-foreground mt-1">
                {xpRequired - hero.experience} XP pour le niveau {hero.level + 1}
              </div>
            )}
            {hero.level === 10 && (
              <div className="text-xs text-accent mt-1">
                Niveau maximum atteint !
              </div>
            )}
          </div>

          {/* Statistiques actuelles */}
          <div className="p-3 border rounded-lg">
            <h4 className="font-semibold mb-2">Statistiques actuelles</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span>Dégâts:</span>
                <span className="font-medium">{getEffectiveStats(hero).damage}</span>
              </div>
              <div className="flex justify-between">
                <span>Précision:</span>
                <span className="font-medium">{getEffectiveStats(hero).accuracy}%</span>
              </div>
              <div className="flex justify-between">
                <span>Vitesse:</span>
                <span className="font-medium">{getEffectiveStats(hero).attackSpeed.toFixed(1)}/s</span>
              </div>
              <div className="flex justify-between">
                <span>Critique:</span>
                <span className="font-medium">{getEffectiveStats(hero).criticalChance}%</span>
              </div>
              <div className="flex justify-between">
                <span>Portée:</span>
                <span className="font-medium">
                  {HERO_TYPES[hero.type].attackConfig.maxRange} cases ({HERO_TYPES[hero.type].attackConfig.shape})
                </span>
              </div>
              <div className="flex justify-between">
                <span>Cibles max:</span>
                <span className="font-medium">{HERO_TYPES[hero.type].attackConfig.maxTargets || 1}</span>
              </div>
            </div>
          </div>

          {/* Compétences communes */}
          <div>
            <h4 className="font-semibold mb-3">Compétences de base</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(heroSkills)
                .filter(([skillId]) => ['damageBoost', 'speedBoost', 'accuracyBoost', 'criticalBoost'].includes(skillId))
                .map(([skillId, skill]) => renderSkillCard(skillId, skill))}
            </div>
          </div>

          {/* Compétences spéciales */}
          <div>
            <h4 className="font-semibold mb-3">
              Compétences spéciales 
              <Badge variant="outline" className="ml-2">
                {specialSkillsUpgraded}/2 utilisées
              </Badge>
            </h4>
            <div className="grid grid-cols-1 gap-3">
              {Object.entries(heroSkills)
                .filter(([skillId]) => skillId.startsWith('specialSkill'))
                .map(([skillId, skill]) => renderSkillCard(skillId, skill))}
            </div>
            {specialSkillsUpgraded < 2 && (
              <div className="mt-2 p-2 bg-primary/10 rounded text-xs text-muted-foreground">
                💡 Vous pouvez améliorer {2 - specialSkillsUpgraded} compétence(s) spéciale(s) supplémentaire(s)
              </div>
            )}
            {specialSkillsUpgraded === 2 && (
              <div className="mt-2 p-2 bg-accent/10 rounded text-xs text-muted-foreground">
                🔒 Limite atteinte : 2 compétences spéciales maximum par héros
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="p-3 bg-primary/10 rounded-lg">
            <h4 className="font-semibold text-sm mb-1">💡 Comment ça marche</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Gagnez 1 XP par hit réussi + XP bonus selon le tier de l'ennemi tué</li>
              <li>• Chaque niveau vous donne +1 point de compétence</li>
              <li>• Les statistiques de base augmentent automatiquement</li>
              <li>• Vous ne pouvez améliorer que 2 compétences spéciales sur 3</li>
              <li>• Niveau maximum: 10</li>
            </ul>
          </div>

          {/* Interface de ciblage */}
          <div className="p-3 border rounded-lg">
            <h4 className="font-semibold mb-2">🎯 Mode de ciblage</h4>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm">Mode actuel:</span>
              <Badge variant="outline">
                {hero.targetingMode === 'first' ? 'Premières cibles' : 'Dernières cibles'}
              </Badge>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={onToggleTargeting}
              className="w-full"
            >
              Changer vers: {hero.targetingMode === 'first' ? 'Dernières cibles' : 'Premières cibles'}
            </Button>
            <div className="text-xs text-muted-foreground mt-2">
              • Premières : cible les ennemis les moins avancés sur le chemin<br/>
              • Dernières : cible les ennemis les plus avancés sur le chemin
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}