
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./Player.css";

function urlValida(valor) {
  try {
    const url = new URL(valor);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export default function Player() {
  const navegar = useNavigate();
  const [searchParams] = useSearchParams();

  const [url, setUrl] = useState("");
  const [titulo, setTitulo] = useState("Assistir agora");
  const [reproduzir, setReproduzir] = useState("");

  useEffect(() => {
    const link = searchParams.get("url") || "";
    const nome = searchParams.get("titulo") || "Assistir agora";

    setUrl(link);
    setTitulo(nome);
    setReproduzir(urlValida(link) ? link : "");
  }, [searchParams]);

  function abrirPlayer(e) {
    e.preventDefault();

    const link = url.trim();

    if (!urlValida(link)) {
      alert("Informe um endereço HTTP ou HTTPS válido.");
      return;
    }

    setReproduzir(link);
    setTitulo("Reprodução personalizada");
  }

  return (
    <main className="player-page">
      <header className="player-header">
        <h1>MANINHO DOWNLOADS</h1>
        <p>Seu entretenimento em um só lugar</p>
      </header>

      <section className="player-container">
        <div className="player-topo">
          <h2>▶ {titulo}</h2>

          <button
            type="button"
            className="player-voltar"
            onClick={() => navegar("/")}
          >
            ← Voltar ao site
          </button>
        </div>

        <form onSubmit={abrirPlayer}>
          <input
            type="url"
            placeholder="Cole aqui o link autorizado"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />

          <button type="submit">▶ REPRODUZIR</button>
        </form>

        {reproduzir ? (
          <>
            <div className="video-container">
              <iframe
                src={reproduzir}
                title={titulo}
                allowFullScreen
                allow="autoplay; encrypted-media; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>

            <div className="player-acoes">
              <a
                href={reproduzir}
                target="_blank"
                rel="noopener noreferrer"
              >
                ↗ Abrir em nova aba
              </a>

              <button
                type="button"
                onClick={() => setReproduzir("")}
              >
                ✕ Fechar reprodução
              </button>
            </div>
          </>
        ) : (
          <p className="player-vazio">
            Nenhum conteúdo selecionado. Escolha um conteúdo no catálogo
            ou cole um endereço autorizado acima.
          </p>
        )}

        <p className="player-aviso">
          A reprodução dentro do site depende de a fonte permitir
          incorporação. Se o endereço bloquear o iframe, utilize a opção
          de abrir em nova aba. Links de download, como ZIP e APK,
          não são necessariamente reproduzíveis no player.
        </p>
      </section>
    </main>
  );
}
