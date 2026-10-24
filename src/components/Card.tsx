import { addCategory, groupByCategory, moveColor, removeCategory, removeColor, renameCategory } from '../lib/cards';
import { fr } from '../i18n/fr';
import type { ImageCard, ImagePoint } from '../types';
import { CategoryBar } from './CategoryBar';
import { ColorChip } from './ColorChip';
import { ImagePicker } from './ImagePicker';

export type ExportKind = 'text' | 'png' | 'json';

interface Props {
  card: ImageCard;
  editing: boolean;
  showMarkers: boolean;
  onToggleMarkers: () => void;
  selectedId: string | null;
  onSelect: (colorId: string | null) => void;
  onPick: (at: ImagePoint) => void;
  onChange: (patch: Partial<ImageCard>) => void;
  onToggleEdit: () => void;
  onToggleSave: () => void;
  onFlip: () => void;
  onExport: (kind: ExportKind) => void;
  onCopy: (hex: string) => void;
}

/** Recto d'une carte : l'image, et les couleurs prélevées rangées par catégorie. */
export function Card(props: Props) {
  const { card, editing, selectedId, onSelect, onChange, onCopy } = props;
  const groups = groupByCategory(card);
  const selected = card.colors.find((c) => c.id === selectedId);

  return (
    <article className="card" aria-label={card.name}>
      <ImagePicker
        card={card}
        editing={editing}
        showMarkers={props.showMarkers}
        selectedId={selectedId}
        onPick={props.onPick}
      />
      {card.status === 'loading' && <div className="card-status">{fr.loading}</div>}
      {card.status === 'error' && <div className="card-status">{fr.loadError}</div>}
      {card.status === 'ready' && (
        <div className="card-actions">
          <button
            type="button"
            className={`round-button${editing ? ' on' : ''}`}
            aria-label={editing ? fr.editDone : fr.edit}
            aria-pressed={editing}
            title={editing ? fr.editDone : fr.edit}
            onClick={props.onToggleEdit}
          >
            {editing ? '✓' : '✎'}
          </button>
          <button
            type="button"
            className={`round-button${props.showMarkers ? ' on' : ''}`}
            aria-label={props.showMarkers ? fr.hideMarkers : fr.showMarkers}
            aria-pressed={props.showMarkers}
            title={props.showMarkers ? fr.hideMarkers : fr.showMarkers}
            onClick={props.onToggleMarkers}
          >
            ◎
          </button>
          <button
            type="button"
            className={`round-button${card.saved ? ' on' : ''}`}
            aria-label={card.saved ? fr.unsave : fr.save}
            aria-pressed={card.saved}
            title={card.saved ? fr.unsave : fr.save}
            onClick={props.onToggleSave}
          >
            {card.saved ? '★' : '☆'}
          </button>
          <button type="button" className="round-button" aria-label={fr.flip} title={fr.flipHint} onClick={props.onFlip}>
            ⟳
          </button>
        </div>
      )}
      {editing && <div className="edit-banner">{fr.editBanner}</div>}

      {card.status === 'ready' && (
        <div className="card-panel">
          {editing && (
            <CategoryBar
              categories={card.categories}
              colors={card.colors}
              activeId={card.activeCategoryId}
              onActivate={(id) => onChange({ activeCategoryId: id })}
              onAdd={(name) => onChange(addCategory(card, name))}
              onRename={(id, name) => onChange(renameCategory(card, id, name))}
              onRemove={(id) => onChange(removeCategory(card, id))}
            />
          )}

          {groups.length === 0 && <p className="card-foot">{editing ? fr.noColorsEditing : fr.noColors}</p>}
          {groups.map((g) => (
            <section key={g.category?.id ?? 'none'} className="color-group">
              <h3 className="palette-title">{g.category?.name ?? fr.noCategory}</h3>
              <ul className="swatches">
                {g.colors.map((c) => (
                  <ColorChip
                    key={c.id}
                    color={c}
                    selected={c.id === selectedId}
                    onSelect={() => onSelect(c.id === selectedId ? null : c.id)}
                    onCopy={onCopy}
                    onRemove={editing ? () => onChange(removeColor(card, c.id)) : undefined}
                  />
                ))}
              </ul>
            </section>
          ))}

          {editing && selected && card.categories.length > 0 && (
            <label className="move-row">
              <span className="mini" style={{ background: selected.hex }} />
              {fr.moveTo}
              <select
                value={selected.categoryId ?? ''}
                onChange={(e) => onChange(moveColor(card, selected.id, e.target.value || null))}
              >
                {card.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                {selected.categoryId === null && <option value="">{fr.noCategory}</option>}
              </select>
            </label>
          )}

          {card.colors.length > 0 && (
            <div className="export-row" role="group" aria-label={fr.exportGroup}>
              <button type="button" title={fr.copyPaletteTitle} onClick={() => props.onExport('text')}>
                {fr.copyPalette}
              </button>
              <button type="button" title={fr.exportPngTitle} onClick={() => props.onExport('png')}>
                {fr.exportPng}
              </button>
              <button type="button" title={fr.exportJsonTitle} onClick={() => props.onExport('json')}>
                {fr.exportJson}
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
