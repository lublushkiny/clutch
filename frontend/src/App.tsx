import { AuthProvider } from './contexts/AuthContext';
import AppContent from './AppContent'; // New component to handle auth check

function App() {
  return (
    <AuthProvider>
        <AppContent />
    </AuthProvider>
  );
}

export default App;
