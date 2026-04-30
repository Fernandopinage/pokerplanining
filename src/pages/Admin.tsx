import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../services/socket';
import './Admin.css';

interface RoomInfo {
  roomId: string;
  players: number;
  revealed: boolean;
  stories: number;
  lastActivityAt: number;
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s atrás`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return `${Math.floor(diff / 86400)}d atrás`;
}

export function Admin() {
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchRooms = async () => {
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/admin/rooms`);
      if (!res.ok) throw new Error('Erro ao carregar salas.');
      const data: RoomInfo[] = await res.json();
      // Sort by most recently active first
      data.sort((a, b) => b.lastActivityAt - a.lastActivityAt);
      setRooms(data);
    } catch {
      setError('Não foi possível conectar ao servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (roomId: string) => {
    if (!window.confirm(`Excluir sala ${roomId}? Todos os usuários serão desconectados.`)) return;
    setDeleting(roomId);
    try {
      const res = await fetch(`${API_URL}/api/admin/rooms/${roomId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setRooms(prev => prev.filter(r => r.roomId !== roomId));
    } catch {
      alert('Erro ao excluir sala.');
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteAll = async () => {
    if (rooms.length === 0) return;
    if (!window.confirm(`Excluir todas as ${rooms.length} salas? Todos os usuários serão desconectados.`)) return;
    for (const room of rooms) {
      await fetch(`${API_URL}/api/admin/rooms/${room.roomId}`, { method: 'DELETE' });
    }
    setRooms([]);
  };

  return (
    <div className="admin">
      <div className="admin__glow admin__glow--tl" aria-hidden="true" />

      <div className="admin__header">
        <button className="btn btn--outline admin__back" onClick={() => navigate('/')}>
          ← Voltar
        </button>
        <h1 className="admin__title">⚙️ Gerenciar Salas</h1>
        <div className="admin__actions">
          <button className="btn btn--outline" onClick={fetchRooms} disabled={loading}>
            🔄 Atualizar
          </button>
          {rooms.length > 0 && (
            <button className="btn admin__btn-danger" onClick={handleDeleteAll}>
              🗑️ Excluir todas
            </button>
          )}
        </div>
      </div>

      {error && <p className="admin__error">{error}</p>}

      {loading ? (
        <div className="admin__loader">
          <div className="spinner" />
          <p>Carregando salas...</p>
        </div>
      ) : rooms.length === 0 ? (
        <div className="admin__empty">
          <span className="admin__empty-icon">🏚️</span>
          <p>Nenhuma sala ativa no momento.</p>
        </div>
      ) : (
        <div className="admin__table-wrap">
          <p className="admin__count">{rooms.length} sala{rooms.length !== 1 ? 's' : ''} ativa{rooms.length !== 1 ? 's' : ''}</p>
          <table className="admin__table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Jogadores</th>
                <th>Histórias</th>
                <th>Status</th>
                <th>Última atividade</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rooms.map(room => (
                <tr key={room.roomId}>
                  <td>
                    <span className="admin__room-id">{room.roomId}</span>
                  </td>
                  <td>
                    <span className={`admin__badge ${room.players > 0 ? 'admin__badge--active' : 'admin__badge--empty'}`}>
                      👥 {room.players}
                    </span>
                  </td>
                  <td>{room.stories}</td>
                  <td>
                    {room.revealed
                      ? <span className="admin__badge admin__badge--revealed">Revelado</span>
                      : <span className="admin__badge admin__badge--voting">Votando</span>}
                  </td>
                  <td className="admin__time">{timeAgo(room.lastActivityAt)}</td>
                  <td>
                    <button
                      className="btn admin__btn-danger admin__btn-sm"
                      disabled={deleting === room.roomId}
                      onClick={() => handleDelete(room.roomId)}
                    >
                      {deleting === room.roomId ? '...' : '🗑️ Excluir'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
