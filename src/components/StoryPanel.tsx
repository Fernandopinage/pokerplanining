import type { Story } from '../context/RoomContext';
import './StoryPanel.css';

interface StoryPanelProps {
  story: Story | null;
}

export function StoryPanel({ story }: StoryPanelProps) {
  if (!story) {
    return (
      <div className="story-panel story-panel--empty">
        <span className="story-panel__empty-icon">📋</span>
        <p className="story-panel__empty-text">Nenhuma história selecionada para estimar</p>
      </div>
    );
  }

  return (
    <div className="story-panel">
      <div className="story-panel__header">
        <h3 className="story-panel__label">📋 História para estimar</h3>
        {story.score !== null && (
          <span className="story-panel__score-badge">{story.score} pts</span>
        )}
      </div>
      <p className="story-panel__title">{story.title}</p>
      {story.description && (
        <p className="story-panel__description">{story.description}</p>
      )}
    </div>
  );
}
