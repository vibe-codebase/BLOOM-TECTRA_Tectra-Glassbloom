import { createRoot } from 'react-dom/client';
import '@fontsource/bodoni-moda/latin-500.css';
import '@fontsource/bodoni-moda/latin-600.css';
import '@fontsource/bodoni-moda/latin-500-italic.css';
import '@fontsource/bodoni-moda/latin-600-italic.css';
import '@fontsource/bodoni-moda/latin-700-italic.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/manrope/latin-700.css';
import './styles.css';
import App from './App';

createRoot(document.getElementById('root')!).render(<App />);
