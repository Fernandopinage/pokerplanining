import { BrowserRouter, Navigate, Route, Routes, useSearchParams } from 'react-router-dom';
import { RoomProvider, useRoom } from './context/RoomContext';
import { Admin } from './pages/Admin';
import { Home } from './pages/Home';
import { Room } from './pages/Room';

// Handles the redirect when coming from a room link without a name
function HomeWithRoomRedirect() {
  const [params] = useSearchParams();
  const { userName } = useRoom();
  const roomParam = params.get('room');

  if (userName && roomParam) {
    return <Navigate to={`/room/${roomParam}`} replace />;
  }

  return <Home />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeWithRoomRedirect />} />
      <Route path="/room/:roomId" element={<Room />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <RoomProvider>
        <AppRoutes />
      </RoomProvider>
    </BrowserRouter>
  );
}

