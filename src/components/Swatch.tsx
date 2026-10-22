import type { PaletteColor } from '../engine';
import { fr } from '../i18n/fr';

const pct = (p: number) => (p < 0.001 ? (p * 100).toFixed(2) : (p * 100).toFixed(1)).replace('.', ',') + ' %';

interface Props {
  color: PaletteColor;
  kind?: 'pinned';
  onCopy: (hex: string) => void;
  onRemove?: () => void;
}

export function Swatch({ color, kind, onCopy, onRemove }: Props) {
  const tag = kind === 'pinned' ? null : color.accent ? fr.accent : color.lch.C < 0.04 ? fr.neutral : null;
  return (
    <li className="swatch">
      <span className="swatch-chip" style={{ background: color.hex }}>
        {tag && <span className="swatch-tag">{tag}</span>}
      </span>
      <span className="swatch-text">
        <button type="button" className="swatch-hex" onClick={() => onCopy(color.hex)}>
          {color.hex}
        </button>
        <span className="swatch-meta">
          {kind === 'pinned' ? `h ${Math.round(color.lch.h)}°` : pct(color.proportion)}
        </span>
      </span>
      {onRemove && (
        <button type="button" className="swatch-remove" aria-label={fr.removePin(color.hex)} onClick={onRemove}>
          ×
        </button>
      )}
    </li>
  );
}
