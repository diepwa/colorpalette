import { fr } from './i18n/fr';

export default function App() {
  return (
    <main className="app">
      <h1>{fr.appTitle}</h1>
      <p className="subtitle">{fr.appSubtitle}</p>
      <p>{fr.placeholder}</p>
    </main>
  );
}
