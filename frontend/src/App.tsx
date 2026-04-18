import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Room from './pages/Room';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* トップページ：ルーム作成 */}
        <Route path="/" element={<Home />} />
        {/* チャット画面：URLで共有される想定 */}
        <Route path="/room/:roomId" element={<Room />} />
      </Routes>
    </BrowserRouter>
  );
}