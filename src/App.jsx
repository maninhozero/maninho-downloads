
import { useEffect, useState } from "react";
import "./App.css";

const iniciais = [
  {
    id: 1,
    nome: "PPSSPP",
    categoria: "Aplicativos",
    descricao: "Emulador de PSP para Android e Windows.",
    icone: "🎮",
    plataforma: "Android / PC",
    link: "https://www.ppsspp.org/download/",
    imagem: ""
  },
  {
    id: 2,
    nome: "OBS Studio",
    categoria: "Programas",
    descricao: "Grave vídeos e faça transmissões ao vivo.",
    icone: "📹",
    plataforma: "Windows",
    link: "https://obsproject.com/download",
    imagem: ""
  },
  {
    id: 3,
    nome: "VLC Media Player",
    categoria: "Programas",
    descricao: "Reprodutor gratuito de vídeos e músicas.",
    icone: "🎬",
    plataforma: "Windows",
    link: "https://www.videolan.org/vlc/",
    imagem: ""
  },
  {
    id: 4,
    nome: "Steam",
    categoria: "Jogos",
    descricao: "Plataforma para encontrar e jogar games.",
    icone: "🕹️",
    plataforma: "Windows",
    link: "https://store.steampowered.com/about/",
    imagem: ""
  },
  {
    id: 5,
    nome: "7-Zip",
    categoria: "Programas",
    descricao: "Compacte e extraia arquivos gratuitamente.",
    icone: "📦",
    plataforma: "Windows",
    link: "https://www.7-zip.org/",
    imagem: ""
  },
  {
    id: 6,
    nome: "GIMP",
    categoria: "Aplicativos",
    descricao: "Editor gratuito de imagens.",
    icone: "🎨",
    plataforma: "Windows / PC",
    link: "https://www.gimp.org/downloads/",
    imagem: ""
  }
];

function App() {
  const [produtos, setProdutos] = useState(() => {
    try {
      const salvos = localStorage.getItem("maninho_produtos");
      return salvos ? JSON.parse(salvos) : iniciais;
    } catch {
      return iniciais;
    }
  });

  const [categoria, setCategoria] = useState("Todos");
  const [busca, setBusca] = useState("");
  const [admin, setAdmin] = useState(false);

  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("Jogos");
  const [descricao, setDescricao] = useState("");
  const [link, setLink] = useState("");
  const [plataforma, setPlataforma] = useState("Windows");
  const [imagem, setImagem] = useState("");

  useEffect(() => {
    localStorage.setItem("maninho_produtos", JSON.stringify(produtos));
  }, [produtos]);

  function cadastrar(e) {
    e.preventDefault();

    if (!nome.trim() || !descricao.trim() || !link.trim()) {
      alert("Preencha nome, descrição e link!");
      return;
    }

    try {
      const endereco = new URL(link);
      if (!["http:", "https:"].includes(endereco.protocol)) {
        throw new Error("Link inválido");
      }
    } catch {
      alert("Digite um link válido começando com https://");
      return;
    }

    if (imagem.trim()) {
      try {
        const enderecoImagem = new URL(imagem);
        if (!["http:", "https:"].includes(enderecoImagem.protocol)) {
          throw new Error("Imagem inválida");
        }
      } catch {
        alert("Digite uma URL válida para a imagem.");
        return;
      }
    }

    const novo = {
      id: Date.now(),
      nome: nome.trim(),
      categoria: tipo,
      descricao: descricao.trim(),
      icone: tipo === "Jogos" ? "🎮" : tipo === "Aplicativos" ? "📱" : "💻",
      plataforma,
      link,
      imagem
    };

    setProdutos(atual => [...atual, novo]);

    setNome("");
    setDescricao("");
    setLink("");
    setImagem("");

    alert("Download cadastrado com sucesso!");
  }

  function excluir(id) {
    if (window.confirm("Deseja excluir este download?")) {
      setProdutos(atual => atual.filter(p => p.id !== id));
    }
  }

  const filtrados = produtos.filter(produto => {
    const combinaCategoria =
      categoria === "Todos" || produto.categoria === categoria;

    const texto = busca.toLowerCase();

    const combinaBusca =
      produto.nome.toLowerCase().includes(texto) ||
      produto.descricao.toLowerCase().includes(texto);

    return combinaCategoria && combinaBusca;
  });

  return (
    <div className="site">
      <header className="topo">
        <a className="logo" href="#inicio">
          <span className="logo-icon">M</span>
          <span>MANINHO <strong>DOWNLOADS</strong></span>
        </a>

        <nav>
          <a href="#inicio">Início</a>
          <a href="#catalogo">Downloads</a>
          <a href="#sobre">Sobre</a>
        </nav>

        <button
          className="admin-botao"
          onClick={() => setAdmin(!admin)}
        >
          {admin ? "FECHAR PAINEL ✕" : "⚙ ADMIN"}
        </button>
      </header>

      <main>
        <section className="hero" id="inicio">
          <div className="hero-texto">
            <span className="etiqueta">⚡ SUA CENTRAL DE DOWNLOADS</span>

            <h1>
              O SEU MUNDO
              <br />
              <span>COMEÇA AQUI.</span>
            </h1>

            <p>
              Jogos, aplicativos e programas em um só lugar.
              Descubra novidades e encontre seus downloads favoritos.
            </p>

            <a href="#catalogo" className="botao-principal">
              EXPLORAR DOWNLOADS ↗
            </a>
          </div>

          <div className="hero-arte">
            <div className="circulo">M</div>
            <span className="arte-legenda">GAMING • SOFTWARE • APPS</span>
          </div>
        </section>

        <section className="vantagens">
          <div>🎮 <span>Jogos</span></div>
          <div>📱 <span>Aplicativos</span></div>
          <div>💻 <span>Programas</span></div>
          <div>⚡ <span>Acesso rápido</span></div>
        </section>

        {admin && (
          <section className="painel-admin">
            <span className="subtitulo">ÁREA DO ADMINISTRADOR</span>
            <h2>Adicionar novo download</h2>

            <form onSubmit={cadastrar}>
              <label>Nome do conteúdo</label>
              <input
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Ex: Meu jogo favorito"
                required
              />

              <label>Categoria</label>
              <select value={tipo} onChange={e => setTipo(e.target.value)}>
                <option>Jogos</option>
                <option>Aplicativos</option>
                <option>Programas</option>
              </select>

              <label>Descrição</label>
              <textarea
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                placeholder="Escreva uma descrição..."
                required
              />

              <label>Plataforma</label>
              <select
                value={plataforma}
                onChange={e => setPlataforma(e.target.value)}
              >
                <option>Windows</option>
                <option>Android</option>
                <option>Windows / Android</option>
                <option>Web</option>
                <option>Outra</option>
              </select>

              <label>Link de download</label>
              <input
                type="url"
                value={link}
                onChange={e => setLink(e.target.value)}
                placeholder="https://..."
                required
              />

              <label>URL da imagem de capa (opcional)</label>
              <input
                type="url"
                value={imagem}
                onChange={e => setImagem(e.target.value)}
                placeholder="https://..."
              />

              <button type="submit" className="botao-principal">
                + CADASTRAR DOWNLOAD
              </button>
            </form>

            <div className="admin-lista">
              <h3>Gerenciar conteúdos ({produtos.length})</h3>

              {produtos.map(produto => (
                <div className="admin-item" key={produto.id}>
                  <span>{produto.icone} {produto.nome}</span>
                  <button onClick={() => excluir(produto.id)}>
                    EXCLUIR
                  </button>
                </div>
              ))}
            </div>

            <p className="aviso-admin">
              Atenção: este painel é local e não tem senha.
              Os cadastros ficam salvos somente neste navegador.
              Para administrar o site publicado, precisaremos de um sistema
              com autenticação e banco de dados.
            </p>
          </section>
        )}

        <section className="catalogo" id="catalogo">
          <div className="titulo-secao">
            <div>
              <span className="subtitulo">NOSSA BIBLIOTECA</span>
              <h2>Explore os downloads</h2>
            </div>
            <span className="contador">{filtrados.length} ITENS</span>
          </div>

          <div className="pesquisa">
            <span>⌕</span>
            <input
              placeholder="Pesquisar jogos, aplicativos..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>

          <div className="filtros">
            {["Todos", "Jogos", "Aplicativos", "Programas"].map(item => (
              <button
                key={item}
                className={categoria === item ? "filtro ativo" : "filtro"}
                onClick={() => setCategoria(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="grade">
            {filtrados.map(produto => (
              <article className="card" key={produto.id}>
                <div className="capa azul">
                  {produto.imagem ? (
                    <img
                      src={produto.imagem}
                      alt={produto.nome}
                      className="capa-imagem"
                    />
                  ) : (
                    <span>{produto.icone}</span>
                  )}
                  <small>{produto.categoria}</small>
                </div>

                <div className="card-info">
                  <h3>{produto.nome}</h3>
                  <p>{produto.descricao}</p>

                  <div className="card-rodape">
                    <span>{produto.plataforma}</span>
                    <a href={produto.link} target="_blank" rel="noreferrer">
                      BAIXAR ↗
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {filtrados.length === 0 && (
            <p className="vazio">Nenhum download encontrado.</p>
          )}
        </section>

        <section className="sobre" id="sobre">
          <span className="subtitulo">NOSSA PLATAFORMA</span>
          <h2>MANINHO DOWNLOADS</h2>
          <p>
            Um espaço para descobrir jogos, aplicativos e programas.
            Os downloads são direcionados às páginas dos seus criadores.
          </p>
        </section>
      </main>

      <footer>
        <span>© 2026 MANINHO DOWNLOADS</span>
        <span>FEITO PARA QUEM AMA TECNOLOGIA 🚀</span>
      </footer>
    </div>
  );
}

export default App;
