import './styles.css';
import { GameController } from './app/GameController';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Missing #app root');

new GameController(root).start();
