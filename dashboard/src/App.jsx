import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Operacional from './pages/Operacional.jsx';
import Confirmacoes from './pages/Confirmacoes.jsx';
import Estrategico from './pages/Estrategico.jsx';
import Agente from './pages/Agente.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/operacional" replace />} />
        <Route path="operacional"  element={<Operacional />} />
        <Route path="confirmacoes" element={<Confirmacoes />} />
        <Route path="estrategico"  element={<Estrategico />} />
        <Route path="agente"       element={<Agente />} />
      </Route>
    </Routes>
  );
}
