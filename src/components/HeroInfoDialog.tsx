import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { HERO_TYPES } from '../data/heroTypes'

interface HeroInfoDialogProps {
  heroType: 'archer' | 'warrior' | 'mage' | null
  isOpen: boolean
  onClose: () => void
  onShowRange: () => void
  onBuy: () => void
  canAfford: boolean
}

export function HeroInfoDialog({ 
  heroType, 
  isOpen, 
  onClose, 
  onShowRange, 
  onBuy, 
  canAfford 
}: HeroInfoDialogProps) {
  if (!heroType) return null

  const hero = HERO_TYPES[heroType]
  const { attackConfig } = hero

  const formatRange = () => {
    const rangeText = attackConfig.minRange === attackConfig.maxRange 
      ? `${attackConfig.minRange}` 
      : `${attackConfig.minRange}-${attackConfig.maxRange}`
    
    // Ajouter le type de forme pour plus de clarté
    const shapeText = attackConfig.shape === 'diamond' ? ' (diamant)' : 
                     attackConfig.shape === 'ligne' ? ' (ligne)' : 
                     attackConfig.shape === 'croix' ? ' (croix)' : 
                     ` (${attackConfig.shape})`
    
    return `${rangeText} cases${shapeText}`
  }

  const formatAttackType = () => {
    // Logique dynamique : si maxTargets > 1 et type n'est pas AOE, afficher "multicible"
    if (attackConfig.maxTargets && attackConfig.maxTargets > 1 && attackConfig.type !== 'AOE') {
      return 'multicible'
    }
    
    if (attackConfig.type === 'AOE' && attackConfig.aoeRadius) {
      return `${attackConfig.type} (rayon ${attackConfig.aoeRadius})`
    }
    return attackConfig.type
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-2xl">{hero.emoji}</span>
            <div>
              <div className="text-xl">{hero.name}</div>
              <Badge variant="secondary" className="bg-accent text-black">
                {hero.cost} or
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Description */}
          <div>
            <h4 className="font-semibold mb-2">Description</h4>
            <p className="text-sm text-muted-foreground">{hero.description}</p>
          </div>

          {/* Effet spécial */}
          <div>
            <h4 className="font-semibold mb-2">Effet spécial</h4>
            <p className="text-sm text-accent font-medium">{hero.specialEffect}</p>
          </div>

          {/* Statistiques */}
          <div>
            <h4 className="font-semibold mb-2">Statistiques de base</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span>Dégâts:</span>
                <span className="font-medium">{hero.baseStats.damage}</span>
              </div>
              <div className="flex justify-between">
                <span>Précision:</span>
                <span className="font-medium">{hero.baseStats.accuracy}%</span>
              </div>
              <div className="flex justify-between">
                <span>Vitesse:</span>
                <span className="font-medium">{hero.baseStats.attackSpeed}s</span>
              </div>
              <div className="flex justify-between">
                <span>Critique:</span>
                <span className="font-medium">{hero.baseStats.criticalChance}%</span>
              </div>
            </div>
          </div>

          {/* Configuration d'attaque */}
          <div>
            <h4 className="font-semibold mb-2">Attaque</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Type:</span>
                <span className="font-medium">{formatAttackType()}</span>
              </div>
              <div className="flex justify-between">
                <span>Portée:</span>
                <span className="font-medium">{attackConfig.maxRange} cases</span>
              </div>
              {attackConfig.maxTargets && (
                <div className="flex justify-between">
                  <span>Max cibles:</span>
                  <span className="font-medium text-accent">{attackConfig.maxTargets}</span>
                </div>
              )}
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              onClick={onShowRange}
              className="flex-1"
            >
              Voir la portée
            </Button>
            <Button 
              onClick={onBuy}
              disabled={!canAfford}
              className="flex-1"
            >
              {canAfford ? 'Acheter' : 'Pas assez d\'or'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}