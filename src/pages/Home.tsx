import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRoom } from '../context/RoomContext';
import { API_URL } from '../services/socket';
import './Home.css';

export function Home() {
  const [searchParams] = useSearchParams();
  const roomParam = searchParams.get('room') ?? '';
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

    let roomId: string | undefined;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${API_URL}/api/rooms`, { method: 'POST', signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        roomId = data.roomId;
      } else {
        setError('Erro ao criar sala. Tente novamente.');
        setLoading(false);
        return;
      }
    } catch {
      setError('Não foi possível conectar ao servidor. Verifique se o servidor está rodando.');
      setLoading(false);
      return;
    }

    setUserName(name.trim());
    setLoading(false);
    navigate(`/room/${roomId}`);
  };

  const handleJoin = async (roomCode: string) => {
    if (!name.trim()) {
      setError('Por favor, informe seu nome.');
      return;
    }
    const code = roomCode.trim().toUpperCase();
    if (!code) {
      setError('Por favor, informe o código da sala.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${API_URL}/api/rooms/${code}`, { signal: controller.signal });
      clearTimeout(timer);
      const data = await res.json();
      if (!data.exists) {
        setError('Sala não encontrada. Verifique o código.');
        return;
      }
      setUserName(name.trim());
      navigate(`/room/${code}`);
    } catch {
      setError('Erro ao entrar na sala. Verifique se o servidor está rodando.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomParam) {
      handleJoin(roomParam);
    } else if (mode === 'create') {
      handleCreate();
    } else {
      handleJoin(joinRoomId);
    }
  };

  // ── Simplified join view when arriving via invite link ──────────────────────
  if (roomParam) {
    return (
      <div className="home home--join-only">
        <div className="home__glow home__glow--tl" aria-hidden="true" />
        <div className="home__glow home__glow--br" aria-hidden="true" />
        <div className="home__join-center">
          <div className="home__card">
            <div className="home__card-header">
              <span className="home__card-logo" aria-hidden="true">⚔️</span>
              <h2 className="home__card-title">Poker Planning</h2>
              <p className="home__card-sub">Você foi convidado para uma sala</p>
            </div>

            <div className="home__room-badge">
              <span className="home__room-badge-label">Código da sala</span>
              <code className="home__room-badge-code">{roomParam.toUpperCase()}</code>
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
              {error && <p className="home__error">{error}</p>}
              <button
                className="btn btn--primary btn--lg home__submit"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Aguarde...' : '🔗 Entrar na sala'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── Normal landing page ──────────────────────────────────────────────────────
  return (
    <div className="home">
      <div className="home__glow home__glow--tl" aria-hidden="true" />
      <div className="home__glow home__glow--br" aria-hidden="true" />

      {/* Left: hero */}
      <div className="home__left">
        <span className="home__eyebrow">⚔️ Planning Poker Gratuito</span>
        <h1 className="home__title">
          Estime <span className="home__title-accent">histórias</span><br />
          em equipe, em tempo real.
        </h1>
        <p className="home__subtitle">
          Poker Planning é uma ferramenta colaborativa e gratuita para equipes ágeis
          estimarem histórias de usuário — sem cadastro, sem limites.
        </p>
        <ul className="home__checklist">
          <li>Sessões sincronizadas em tempo real via WebSocket</li>
          <li>Crie ou entre em salas com um único clique</li>
          <li>Sequência de Fibonacci para estimativas precisas</li>
          <li>Revele os votos quando o time estiver pronto</li>
        </ul>
        <div className="home__badges">
          <span className="home__badge">⚡ Tempo real</span>
          <span className="home__badge">🆓 Gratuito</span>
          <span className="home__badge">🔒 Sem cadastro</span>
          <span className="home__badge">♾️ Ilimitado</span>
        </div>
      </div>

      {/* Right: login card */}
      <div className="home__right">
        <div className="home__card">
          <div className="home__card-header">
            <span className="home__card-logo" aria-hidden="true">⚔️</span>
            <h2 className="home__card-title">Poker Planning</h2>
            <p className="home__card-sub">Entre numa sala ou crie uma nova</p>
          </div>

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
      </div>
    </div>
  );
}
