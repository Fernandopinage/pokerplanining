import { useState } from 'react';
import type { Story } from '../context/RoomContext';
import './StoriesDrawer.css';

interface StoriesDrawerProps {
  open: boolean;
  onClose: () => void;
  stories: Story[];
  currentStoryId: string | null;
  isOwner: boolean;
  onAddStory: (title: string, description: string) => void;
  onSetActive: (storyId: string) => void;
  onRemove: (storyId: string) => void;
}

export function StoriesDrawer({
  open,
  onClose,
  stories,
  currentStoryId,
  isOwner,
  onAddStory,
  onSetActive,
  onRemove,
}: StoriesDrawerProps) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleAdd = () => {
    if (!title.trim()) return;
    onAddStory(title.trim(), description.trim());
    setTitle('');
    setDescription('');
    setShowForm(false);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setTitle('');
    setDescription('');
  };

  return (
    <>
      {open && <div className="stories-drawer__backdrop" onClick={onClose} />}
      <div className={`stories-drawer ${open ? 'stories-drawer--open' : ''}`} aria-hidden={!open}>
        <div className="stories-drawer__header">
          <h2 className="stories-drawer__title">📋 Histórias</h2>
          <button className="stories-drawer__close-btn" onClick={onClose} aria-label="Fechar painel">
            ✕
          </button>
        </div>

        {isOwner && (
          <div className="stories-drawer__add-area">
            {!showForm ? (
              <button className="btn btn--add-story" onClick={() => setShowForm(true)}>
                + Nova história
              </button>
            ) : (
              <div className="stories-drawer__form">
                <input
                  className="stories-drawer__input"
                  type="text"
                  placeholder="Título da história *"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={120}
                  autoFocus
                />
                <textarea
                  className="stories-drawer__textarea"
                  placeholder="Descrição (opcional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={1000}
                  rows={3}
                />
                <div className="stories-drawer__form-actions">
                  <button className="btn btn--primary" onClick={handleAdd} disabled={!title.trim()}>
                    Salvar
                  </button>
                  <button className="btn btn--outline" onClick={handleCancelForm}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="stories-drawer__list">
          {stories.length === 0 && (
            <p className="stories-drawer__empty">
              {isOwner
                ? 'Clique em "+ Nova história" para começar.'
                : 'Nenhuma história adicionada ainda.'}
            </p>
          )}
          {stories.map((story) => {
            const isActive = story.id === currentStoryId;
            return (
              <div
                key={story.id}
                className={`stories-drawer__item ${isActive ? 'stories-drawer__item--active' : ''}`}
                onClick={() => isOwner && !isActive && onSetActive(story.id)}
                title={isOwner && !isActive ? 'Definir como história ativa' : undefined}
              >
                <div className="stories-drawer__item-top">
                  <span className="stories-drawer__item-title">{story.title}</span>
                  <div className="stories-drawer__item-actions">
                    {story.score !== null && (
                      <span className="stories-drawer__item-score">{story.score} pts</span>
                    )}
                    {isOwner && (
                      <button
                        className="stories-drawer__item-delete"
                        title="Apagar história"
                        onClick={(e) => { e.stopPropagation(); onRemove(story.id); }}
                        aria-label="Apagar história"
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </div>
                {story.description && (
                  <p className="stories-drawer__item-desc">{story.description}</p>
                )}
                {isActive && (
                  <span className="stories-drawer__item-badge">▶ Em estimativa</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
