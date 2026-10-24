import { fr } from '../i18n/fr';
import type { PickedColor } from '../types';

interface Props {
  color: PickedColor;
  selected: boolean;
  /** Repère affiché sur l'échantillon (1 ou 2 pour la transition). */
  badge?: string;
  onSelect: () => void;
  onCopy: (hex: string) => void;
  onRemove?: () => void;
}

/** Couleur prélevée : échantillon (sélection), hex (copie) et retrait en mode édition. */
export function ColorChip({ color, selected, badge, onSelect, onCopy, onRemove }: Props) {
  return (
    <li className={`swatch${selected || badge ? ' selected' : ''}`}>
      <button
        type="button"
        className="swatch-chip"
        style={{ background: color.hex }}
        aria-pressed={selected}
        aria-label={fr.selectColor(color.hex)}
        onClick={onSelect}
      >
        {badge && <span className="swatch-badge">{badge}</span>}
      </button>
      <button type="button" className="swatch-hex" onClick={() => onCopy(color.hex)}>
        {color.hex}
      </button>
      {onRemove && (
        <button type="button" className="swatch-remove" aria-label={fr.removeColor(color.hex)} onClick={onRemove}>
          ×
        </button>
      )}
    </li>
  );
}
