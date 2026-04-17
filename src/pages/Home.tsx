import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoom } from '../context/RoomContext';
import { API_URL } from '../services/socket';
import './Home.css';

export function Home() {
  const [name, setName] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setUserName } = useRoom();
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Por favor, informe seu nome.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/rooms`, { method: 'POST' });
      const data = await res.json();
      setUserName(name.trim());
      navigate(`/room/${data.roomId}`);
    } catch {
      setError('Erro ao criar sala. Verifique se o servidor está rodando.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!name.trim()) {
      setError('Por favor, informe seu nome.');
      return;
    }
    if (!joinRoomId.trim()) {
      setError('Por favor, informe o código da sala.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/rooms/${joinRoomId.trim().toUpperCase()}`);
      const data = await res.json();
      if (!data.exists) {
        setError('Sala não encontrada. Verifique o código.');
        return;
      }
      setUserName(name.trim());
      navigate(`/room/${joinRoomId.trim().toUpperCase()}`);
    } catch {
      setError('Erro ao entrar na sala. Verifique se o servidor está rodando.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'create') handleCreate();
    else handleJoin();
  };

  return (
    <div className="home">
      <div className="home__hero">
        <div className="home__logo">⚔️</div>
        <h1 className="home__brand">Battle Poker</h1>
        <p className="home__description">
          Ferramenta gratuita de Planning Poker para equipes ágeis.
          <br />
          Estime histórias de usuário de forma colaborativa e eficiente.
        </p>
      </div>

      <div className="home__card">
        <div className="home__tabs">
          <button
            className={`home__tab${mode === 'create' ? ' home__tab--active' : ''}`}
            onClick={() => { setMode('create'); setError(''); }}
          >
            Criar sala
          </button>
          <button
            className={`home__tab${mode === 'join' ? ' home__tab--active' : ''}`}
            onClick={() => { setMode('join'); setError(''); }}
          >
            Entrar em sala
          </button>
        </div>

        <form className="home__form" onSubmit={handleSubmit}>
          <div className="home__field">
            <label className="home__label" htmlFor="name">Seu nome</label>
            <input
              id="name"
              className="home__input"
              type="text"
              placeholder="Como você quer ser chamado?"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
              autoFocus
            />
          </div>

          {mode === 'join' && (
            <div className="home__field">
              <label className="home__label" htmlFor="roomId">Código da sala</label>
              <input
                id="roomId"
                className="home__input home__input--code"
                type="text"
                placeholder="Ex: A1B2C3D4"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                maxLength={8}
              />
            </div>
          )}

          {error && <p className="home__error">{error}</p>}

          <button
            className="btn btn--primary btn--lg home__submit"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Aguarde...' : mode === 'create' ? '🚀 Começar' : '🔗 Entrar'}
          </button>
        </form>
      </div>

      <div className="home__features">
        <div className="home__feature">
          <span className="home__feature-icon">⚡</span>
          <span>Tempo real</span>
        </div>
        <div className="home__feature">
          <span className="home__feature-icon">🆓</span>
          <span>100% gratuito</span>
        </div>
        <div className="home__feature">
          <span className="home__feature-icon">🔒</span>
          <span>Sem cadastro</span>
        </div>
        <div className="home__feature">
          <span className="home__feature-icon">♾️</span>
          <span>Ilimitado</span>
        </div>
      </div>
    </div>
  );
}
