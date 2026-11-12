
import { useState } from "react";
import "./Player.css";

export default function Player() {
  const [url, setUrl] = useState("");
  const [reproduzir, setReproduzir] = useState("");

  function abrirPlayer(e) {
    e.preventDefault();

    if (!url.trim()) return;

    setReproduzir(url.trim());
  }

  return (
    <main className="player-page">
      <header className="player-header">
        <h1>MANINHO TV</h1>
        <p>Seu entretenimento em um só lugar</p>
      </header>

      <section className="player-container">
        <h2>Assistir agora</h2>

        <form onSubmit={abrirPlayer}>
          <input
            type="url"
            placeholder="Cole aqui o link autorizado do vídeo"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />

          <button type="submit">REPRODUZIR</button>
        </form>

        {reproduzir && (
          <div className="video-container">
            <iframe
              src={reproduzir}
              title="Player Maninho TV"
              allowFullScreen
              allow="autoplay; encrypted-media; picture-in-picture"
            />
          </div>
        )}

        <p className="player-aviso">
          Alguns sites bloqueiam a reprodução dentro de outros aplicativos.
          Nesse caso, será necessário utilizar uma fonte que permita
          incorporação.
        </p>
      </section>
    </main>
  );
}
w
