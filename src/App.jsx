
import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import "./App.css";

const produtoVazio = {
  nome: "",
  descricao: "",
  categoria: "Aplicativos",
  plataforma: "Windows",
  icone: "📦",
  link: "",
  imagem: ""
};

const canalVazio = {
  nome: "",
  descricao: "",
  categoria: "TV",
  logo_url: "",
  stream_url: ""
};

function urlValida(valor) {
  try {
    const url = new URL(valor);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function videoDireto(url) {
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
}

export default function App() {
  const [produtos, setProdutos] = useState([]);
  const [canais, setCanais] = useState([]);

  const [session, setSession] = useState(null);
  const [adminAutorizado, setAdminAutorizado] = useState(false);
  const [painelAberto, setPainelAberto] = useState(false);
  const [carregando, setCarregando] = useState(true);

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mensagem, setMensagem] = useState("");

  const [area, setArea] = useState("downloads");
  const [tipoAdmin, setTipoAdmin] = useState("downloads");
  const [pesquisa, setPesquisa] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState("Todos");

  const [novoProduto, setNovoProduto] = useState({ ...produtoVazio });
  const [novoCanal, setNovoCanal] = useState({ ...canalVazio });

  const [editandoDownloadId, setEditandoDownloadId] = useState(null);
  const [editandoCanalId, setEditandoCanalId] = useState(null);

  const [imagemArquivo, setImagemArquivo] = useState(null);
  const [imagemPreview, setImagemPreview] = useState("");
  const [salvando, setSalvando] = useState(false);

  const [canalAtual, setCanalAtual] = useState(null);

  async function carregarProdutos() {
    const { data, error } = await supabase
      .from("downloads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMensagem("Erro ao carregar downloads: " + error.message);
      return;
    }

    setProdutos(
      (data || []).map((item) => ({
        id: item.id,
        nome: item.title,
        descricao: item.description || "",
        categoria: item.category || "Outros",
        plataforma: item.platform || "Windows",
        icone: item.icon || "📦",
        link: item.download_url,
        imagem: item.image_url || ""
      }))
    );
  }

  async function carregarCanais() {
    const { data, error } = await supabase
      .from("canais")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMensagem("Erro ao carregar canais: " + error.message);
      return;
    }

    setCanais(
      (data || []).map((item) => ({
        id: item.id,
        nome: item.nome,
        descricao: item.descricao || "",
        categoria: item.categoria || "TV",
        imagem: item.logo_url || "",
        link: item.stream_url
      }))
    );
  }

  async function verificarAdmin(userId) {
    if (!userId) {
      setAdminAutorizado(false);
      return false;
    }

    const { data, error } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      setAdminAutorizado(false);
      setMensagem("Erro ao verificar administrador: " + error.message);
      return false;
    }

    const autorizado = Boolean(data);
    setAdminAutorizado(autorizado);
    return autorizado;
  }

  useEffect(() => {
    let ativo = true;

    async function iniciar() {
      const { data } = await supabase.auth.getSession();

      if (!ativo) return;

      setSession(data.session);

      if (data.session?.user?.id) {
        await verificarAdmin(data.session.user.id);
      }

      await Promise.all([
        carregarProdutos(),
        carregarCanais()
      ]);

      if (ativo) setCarregando(false);
    }

    iniciar();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, sessionAtual) => {
        if (!ativo) return;

        setSession(sessionAtual);

        if (!sessionAtual) {
          setAdminAutorizado(false);
        } else {
          setTimeout(() => {
            if (ativo) verificarAdmin(sessionAtual.user.id);
          }, 0);
        }
      }
    );

    return () => {
      ativo = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  function limparImagem() {
    if (imagemPreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagemPreview);
    }

    setImagemPreview("");
    setImagemArquivo(null);
  }

  function atualizarProduto(campo, valor) {
    setNovoProduto((atual) => ({
      ...atual,
      [campo]: valor
    }));
  }

  function atualizarCanal(campo, valor) {
    setNovoCanal((atual) => ({
      ...atual,
      [campo]: valor
    }));
  }

  function escolherImagem(e) {
    const arquivo = e.target.files?.[0];

    if (!arquivo) return;

    if (!arquivo.type.startsWith("image/")) {
      setMensagem("Escolha um arquivo de imagem válido.");
      e.target.value = "";
      return;
    }

    if (arquivo.size > 5 * 1024 * 1024) {
      setMensagem("A imagem deve ter no máximo 5 MB.");
      e.target.value = "";
      return;
    }

    limparImagem();
    setImagemArquivo(arquivo);
    setImagemPreview(URL.createObjectURL(arquivo));
    setMensagem("Imagem selecionada. Confira a prévia.");
  }

  async function enviarImagem(pasta, imagemAtual) {
    if (!imagemArquivo) {
      return imagemAtual || "";
    }

    const nomeArquivo = imagemArquivo.name.replace(
      /[^a-zA-Z0-9._-]/g,
      "-"
    );

    const caminho = `${pasta}/${Date.now()}-${nomeArquivo}`;

    const { error } = await supabase.storage
      .from("imagens-downloads")
      .upload(caminho, imagemArquivo, {
        cacheControl: "3600",
        upsert: false,
        contentType: imagemArquivo.type
      });

    if (error) {
      throw new Error("Erro ao enviar imagem: " + error.message);
    }

    const { data } = supabase.storage
      .from("imagens-downloads")
      .getPublicUrl(caminho);

    return data.publicUrl;
  }

  function cancelarEdicao() {
    limparImagem();
    setEditandoDownloadId(null);
    setEditandoCanalId(null);
    setNovoProduto({ ...produtoVazio });
    setNovoCanal({ ...canalVazio });
  }

  function iniciarEdicaoDownload(produto) {
    cancelarEdicao();

    setEditandoDownloadId(produto.id);
    setNovoProduto({
      nome: produto.nome,
      descricao: produto.descricao,
      categoria: produto.categoria,
      plataforma: produto.plataforma,
      icone: produto.icone,
      link: produto.link,
      imagem: produto.imagem
    });

    setImagemPreview(produto.imagem || "");
    setTipoAdmin("downloads");
    setPainelAberto(true);

    document.querySelector(".painel-admin")?.scrollIntoView({
      behavior: "smooth"
    });
  }

  function iniciarEdicaoCanal(canal) {
    cancelarEdicao();

    setEditandoCanalId(canal.id);
    setNovoCanal({
      nome: canal.nome,
      descricao: canal.descricao,
      categoria: canal.categoria,
      logo_url: canal.imagem,
      stream_url: canal.link
    });

    setImagemPreview(canal.imagem || "");
    setTipoAdmin("canais");
    setPainelAberto(true);

    document.querySelector(".painel-admin")?.scrollIntoView({
      behavior: "smooth"
    });
  }

  async function salvarDownload(e) {
    e.preventDefault();

    if (!adminAutorizado || salvando) return;

    if (!urlValida(novoProduto.link)) {
      setMensagem("Informe um link válido para o download.");
      return;
    }

    setSalvando(true);
    setMensagem("Salvando download...");

    try {
      const imagem = await enviarImagem(
        "downloads",
        novoProduto.imagem
      );

      const dados = {
        title: novoProduto.nome.trim(),
        description: novoProduto.descricao.trim(),
        category: novoProduto.categoria,
        platform: novoProduto.plataforma.trim() || "Windows",
        icon: novoProduto.icone.trim() || "📦",
        download_url: novoProduto.link.trim(),
        image_url: imagem
      };

      let resultado;

      if (editandoDownloadId) {
        resultado = await supabase
          .from("downloads")
          .update(dados)
          .eq("id", editandoDownloadId);
      } else {
        resultado = await supabase
          .from("downloads")
          .insert([dados]);
      }

      if (resultado.error) throw resultado.error;

      setMensagem(
        editandoDownloadId
          ? "Download atualizado!"
          : "Download cadastrado!"
      );

      cancelarEdicao();
      await carregarProdutos();
    } catch (error) {
      setMensagem("Erro: " + error.message);
    } finally {
      setSalvando(false);
    }
  }

  async function salvarCanal(e) {
    e.preventDefault();

    if (!adminAutorizado || salvando) return;

    if (!urlValida(novoCanal.stream_url)) {
      setMensagem("Informe um endereço válido para o vídeo ou player.");
      return;
    }

    if (
      novoCanal.logo_url.trim() &&
      !urlValida(novoCanal.logo_url)
    ) {
      setMensagem("O endereço do logotipo não é válido.");
      return;
    }

    setSalvando(true);
    setMensagem("Salvando canal...");

    try {
      const imagem = await enviarImagem(
        "canais",
        novoCanal.logo_url
      );

      const dados = {
        nome: novoCanal.nome.trim(),
        descricao: novoCanal.descricao.trim(),
        categoria: novoCanal.categoria,
        logo_url: imagem,
        stream_url: novoCanal.stream_url.trim()
      };

      let resultado;

      if (editandoCanalId) {
        resultado = await supabase
          .from("canais")
          .update(dados)
          .eq("id", editandoCanalId);
      } else {
        resultado = await supabase
          .from("canais")
          .insert([dados]);
      }

      if (resultado.error) throw resultado.error;

      setMensagem(
        editandoCanalId
          ? "Canal atualizado!"
          : "Canal cadastrado!"
      );

      cancelarEdicao();
      await carregarCanais();
    } catch (error) {
      setMensagem("Erro: " + error.message);
    } finally {
      setSalvando(false);
    }
  }

  async function entrar(e) {
    e.preventDefault();
    setMensagem("Verificando acesso...");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha
    });

    if (error) {
      setMensagem("Não foi possível entrar. Confira e-mail e senha.");
      return;
    }

    setSession(data.session);

    const autorizado = await verificarAdmin(data.session.user.id);

    if (!autorizado) {
      await supabase.auth.signOut();
      setSession(null);
      setMensagem("Esta conta não está autorizada como administradora.");
      return;
    }

    setSenha("");
    setMensagem("Acesso administrativo autorizado!");
  }

  async function sair() {
    await supabase.auth.signOut();
    setSession(null);
    setAdminAutorizado(false);
    cancelarEdicao();
    setMensagem("Você saiu do painel.");
  }

  async function excluirDownload(id) {
    if (!adminAutorizado) return;

    if (!window.confirm("Deseja excluir este download?")) return;

    const { error } = await supabase
      .from("downloads")
      .delete()
      .eq("id", id);

    if (error) {
      setMensagem("Erro ao excluir: " + error.message);
      return;
    }

    setMensagem("Download excluído!");
    await carregarProdutos();
  }

  async function excluirCanal(id) {
    if (!adminAutorizado) return;

    if (!window.confirm("Deseja excluir este canal?")) return;

    const { error } = await supabase
      .from("canais")
      .delete()
      .eq("id", id);

    if (error) {
      setMensagem("Erro ao excluir: " + error.message);
      return;
    }

    if (canalAtual?.id === id) setCanalAtual(null);

    setMensagem("Canal excluído!");
    await carregarCanais();
  }

  const listaAtual = area === "downloads" ? produtos : canais;

  const categorias = [
    "Todos",
    ...new Set(listaAtual.map((item) => item.categoria))
  ];

  const filtrados = listaAtual.filter((item) => {
    const termo = pesquisa.toLowerCase();

    const correspondePesquisa =
      item.nome.toLowerCase().includes(termo) ||
      item.descricao.toLowerCase().includes(termo);

    const correspondeCategoria =
      categoriaAtiva === "Todos" ||
      item.categoria === categoriaAtiva;

    return correspondePesquisa && correspondeCategoria;
  });

  function mudarArea(novaArea) {
    setArea(novaArea);
    setCategoriaAtiva("Todos");
    setPesquisa("");
    setCanalAtual(null);
  }

  if (carregando) {
    return (
      <div className="site carregamento">
        <h2>Carregando MANINHO DOWNLOADS...</h2>
      </div>
    );
  }

  return (
    <div className="site">
      <header className="topo">
        <div className="logo">
          <span className="logo-icon">🎮</span>
          <span>
            MANINHO <strong>DOWNLOADS</strong>
          </span>
        </div>

        <button
          className="admin-botao"
          onClick={() => setPainelAberto(!painelAberto)}
        >
          {painelAberto ? "Fechar painel" : "Área do Administrador"}
        </button>
      </header>

      <section className="banner-principal">
        <img
          src={`${import.meta.env.BASE_URL}banner.png`}
          alt="MANINHO DOWNLOADS"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
        <div className="banner-texto">
          <span>SEU ESPAÇO DIGITAL</span>
          <h1>MANINHO DOWNLOADS</h1>
          <p>Downloads, jogos, aplicativos e canais em um só lugar.</p>
        </div>
      </section>

      <nav className="navegacao-area">
        <button
          className={area === "downloads" ? "selecionado" : ""}
          onClick={() => mudarArea("downloads")}
        >
          📦 Downloads
        </button>

        <button
          className={area === "canais" ? "selecionado" : ""}
          onClick={() => mudarArea("canais")}
        >
          📺 Canais ao Vivo
        </button>
      </nav>

      <section className="vantagens">
        <div>⚡ Conteúdo organizado</div>
        <div>🛡️ Links identificados</div>
        <div>💻 Celular e computador</div>
      </section>

      {painelAberto && (
        <section className="painel-admin">
          <h2 className="subtitulo">🔐 Painel administrativo</h2>

          {!session || !adminAutorizado ? (
            <form className="login-form" onSubmit={entrar}>
              <h3>Entrar como administrador</h3>

              <input
                type="email"
                placeholder="Seu e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <input
                type="password"
                placeholder="Sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />

              <button type="submit">Entrar</button>
            </form>
          ) : (
            <>
              <div className="admin-cabecalho">
                <p>Administrador: {session.user.email}</p>
                <button type="button" onClick={sair}>Sair</button>
              </div>

              <div className="admin-tipos">
                <button
                  className={tipoAdmin === "downloads" ? "selecionado" : ""}
                  onClick={() => {
                    cancelarEdicao();
                    setTipoAdmin("downloads");
                  }}
                >
                  📦 Gerenciar downloads
                </button>

                <button
                  className={tipoAdmin === "canais" ? "selecionado" : ""}
                  onClick={() => {
                    cancelarEdicao();
                    setTipoAdmin("canais");
                  }}
                >
                  📺 Gerenciar canais
                </button>
              </div>

              {tipoAdmin === "downloads" ? (
                <>
                  <h3>
                    {editandoDownloadId
                      ? "✏️ Editar download"
                      : "➕ Adicionar download"}
                  </h3>

                  <form className="form-produto" onSubmit={salvarDownload}>
                    <input
                      placeholder="Nome do arquivo"
                      value={novoProduto.nome}
                      onChange={(e) => atualizarProduto("nome", e.target.value)}
                      required
                    />

                    <input
                      placeholder="Descrição"
                      value={novoProduto.descricao}
                      onChange={(e) => atualizarProduto("descricao", e.target.value)}
                    />

                    <select
                      value={novoProduto.categoria}
                      onChange={(e) => atualizarProduto("categoria", e.target.value)}
                    >
                      <option>Aplicativos</option>
                      <option>Programas</option>
                      <option>Jogos</option>
                      <option>Emuladores</option>
                      <option>Outros</option>
                    </select>

                    <input
                      placeholder="Plataforma"
                      value={novoProduto.plataforma}
                      onChange={(e) => atualizarProduto("plataforma", e.target.value)}
                    />

                    <input
                      placeholder="Ícone ou emoji"
                      value={novoProduto.icone}
                      onChange={(e) => atualizarProduto("icone", e.target.value)}
                    />

                    <input
                      type="url"
                      placeholder="Link para baixar"
                      value={novoProduto.link}
                      onChange={(e) => atualizarProduto("link", e.target.value)}
                      required
                    />

                    <div className="campo-imagem">
                      <label htmlFor="imagem-admin">
                        🖼️ Escolher imagem
                      </label>
                      <input
                        id="imagem-admin"
                        type="file"
                        accept="image/*"
                        onChange={escolherImagem}
                      />
                      {imagemPreview && (
                        <div className="imagem-preview">
                          <img src={imagemPreview} alt="Prévia" />
                          <button
                            type="button"
                            onClick={() => {
                              limparImagem();
                              atualizarProduto("imagem", "");
                            }}
                          >
                            Remover imagem
                          </button>
                        </div>
                      )}
                    </div>

                    <button type="submit" disabled={salvando}>
                      {salvando ? "Salvando..." : "💾 Salvar download"}
                    </button>

                    {(editandoDownloadId || imagemPreview) && (
                      <button type="button" onClick={cancelarEdicao}>
                        Cancelar
                      </button>
                    )}
                  </form>

                  <h3>Downloads cadastrados</h3>

                  <div className="admin-lista">
                    {produtos.map((p) => (
                      <div className="admin-item" key={p.id}>
                        <span>{p.icone} {p.nome}</span>
                        <div className="admin-acoes">
                          <button
                            className="botao-editar"
                            onClick={() => iniciarEdicaoDownload(p)}
                          >
                            ✏️ Editar
                          </button>
                          <button
                            className="botao-excluir"
                            onClick={() => excluirDownload(p.id)}
                          >
                            🗑️ Excluir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <h3>
                    {editandoCanalId
                      ? "✏️ Editar canal"
                      : "➕ Adicionar canal"}
                  </h3>

                  <form className="form-produto" onSubmit={salvarCanal}>
                    <input
                      placeholder="Nome do canal"
                      value={novoCanal.nome}
                      onChange={(e) => atualizarCanal("nome", e.target.value)}
                      required
                    />

                    <input
                      placeholder="Descrição do canal"
                      value={novoCanal.descricao}
                      onChange={(e) => atualizarCanal("descricao", e.target.value)}
                    />

                    <select
                      value={novoCanal.categoria}
                      onChange={(e) => atualizarCanal("categoria", e.target.value)}
                    >
                      <option>TV</option>
                      <option>Esportes</option>
                      <option>Notícias</option>
                      <option>Infantil</option>
                      <option>Filmes</option>
                      <option>Documentários</option>
                      <option>Outros</option>
                    </select>

                    <input
                      type="url"
                      placeholder="Link do logotipo (opcional)"
                      value={novoCanal.logo_url}
                      onChange={(e) => atualizarCanal("logo_url", e.target.value)}
                    />

                    <input
                      type="url"
                      placeholder="Link do player ou vídeo autorizado"
                      value={novoCanal.stream_url}
                      onChange={(e) => atualizarCanal("stream_url", e.target.value)}
                      required
                    />

                    <div className="campo-imagem">
                      <label htmlFor="imagem-canal">
                        🖼️ Enviar logotipo do computador
                      </label>
                      <input
                        id="imagem-canal"
                        type="file"
                        accept="image/*"
                        onChange={escolherImagem}
                      />
                      <small>Imagem de até 5 MB.</small>

                      {imagemPreview && (
                        <div className="imagem-preview">
                          <img src={imagemPreview} alt="Prévia do logotipo" />
                          <button
                            type="button"
                            onClick={() => {
                              limparImagem();
                              atualizarCanal("logo_url", "");
                            }}
                          >
                            Remover imagem
                          </button>
                        </div>
                      )}
                    </div>

                    <button type="submit" disabled={salvando}>
                      {salvando ? "Salvando..." : "💾 Salvar canal"}
                    </button>

                    {(editandoCanalId || imagemPreview) && (
                      <button type="button" onClick={cancelarEdicao}>
                        Cancelar
                      </button>
                    )}
                  </form>

                  <h3>Canais cadastrados</h3>

                  <div className="admin-lista">
                    {canais.map((c) => (
                      <div className="admin-item" key={c.id}>
                        <span>📺 {c.nome}</span>
                        <div className="admin-acoes">
                          <button
                            className="botao-editar"
                            onClick={() => iniciarEdicaoCanal(c)}
                          >
                            ✏️ Editar
                          </button>
                          <button
                            className="botao-excluir"
                            onClick={() => excluirCanal(c.id)}
                          >
                            🗑️ Excluir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {mensagem && <p className="aviso-admin">{mensagem}</p>}
        </section>
      )}

      <main className="catalogo">
        <h2 className="titulo-secao">
          {area === "downloads" ? "Explore nossos downloads" : "Canais ao Vivo"}
        </h2>

        <p className="contador">
          {filtrados.length} {area === "downloads" ? "downloads" : "canais"} disponíveis
        </p>

        <input
          className="pesquisa"
          placeholder={area === "downloads" ? "🔎 Pesquisar downloads..." : "🔎 Pesquisar canais..."}
          value={pesquisa}
          onChange={(e) => setPesquisa(e.target.value)}
        />

        <div className="filtros">
          {categorias.map((categoria) => (
            <button
              key={categoria}
              className={`filtro ${categoriaAtiva === categoria ? "ativo" : ""}`}
              onClick={() => setCategoriaAtiva(categoria)}
            >
              {categoria}
            </button>
          ))}
        </div>

        {area === "canais" && canalAtual && (
          <section className="player-canal">
            <div className="player-cabecalho">
              <h3>📺 {canalAtual.nome}</h3>
              <button onClick={() => setCanalAtual(null)}>
                Fechar player ✕
              </button>
            </div>

            {urlValida(canalAtual.link) ? (
              videoDireto(canalAtual.link) ? (
                <video
                  controls
                  playsInline
                  autoPlay
                  src={canalAtual.link}
                >
                  Seu navegador não suporta vídeo.
                </video>
              ) : (
                <iframe
                  src={canalAtual.link}
                  title={canalAtual.nome}
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              )
            ) : (
              <p>O endereço deste player não é válido.</p>
            )}

            <p className="player-aviso">
              A reprodução depende da compatibilidade e da autorização da fonte.
            </p>
          </section>
        )}

        <div className="grade">
          {filtrados.map((p) => (
            <article className="card" key={p.id}>
              <div className="capa">
                {p.imagem ? (
                  <img
                    className="capa-imagem"
                    src={p.imagem}
                    alt={p.nome}
                    loading="lazy"
                  />
                ) : (
                  <span className="azul">
                    {area === "downloads" ? "📦" : "📺"}
                  </span>
                )}
              </div>

              <div className="card-info">
                <span className="etiqueta">{p.categoria}</span>
                <h3>{p.nome}</h3>
                <p>{p.descricao}</p>

                <div className="card-rodape">
                  <span>
                    {area === "downloads" ? p.plataforma : "Ao vivo"}
                  </span>

                  {area === "downloads" ? (
                    <a
                      href={p.link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Baixar ↗
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setCanalAtual(p);
                        document.querySelector(".player-canal")?.scrollIntoView({
                          behavior: "smooth"
                        });
                      }}
                    >
                      Assistir ▶
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>

        {filtrados.length === 0 && (
          <p className="vazio">
            Nenhum {area === "downloads" ? "download" : "canal"} encontrado.
          </p>
        )}
      </main>

      <footer className="sobre">
        <p>
          © {new Date().getFullYear()} MANINHO DOWNLOADS
          — Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}
