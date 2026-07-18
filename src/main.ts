import "./styles.css";
import { GameController } from "./app/GameController";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Missing #app root");

const game = new GameController(root);
void game.start();
