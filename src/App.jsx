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

export default function App() {
  const [produtos, setProdutos] = useState([]);
  const [admin, setAdmin] = useState(false);
  const [session, setSession] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [pesquisa, setPesquisa] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState("Todos");
  const [mensagem, setMensagem] = useState("");

  const [editandoId, setEditandoId] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [novo, setNovo] = useState({ ...produtoVazio });

  const [imagemArquivo, setImagemArquivo] = useState(null);
  const [imagemPreview, setImagemPreview] = useState("");

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

  useEffect(() => {
    let ativo = true;

    async function iniciar() {
      const { data } = await supabase.auth.getSession();

      if (!ativo) return;

      setSession(data.session);
      await carregarProdutos();

      if (ativo) {
        setCarregando(false);
      }
    }

    iniciar();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, sessionAtual) => {
        if (ativo) {
          setSession(sessionAtual);
        }
      }
    );

    return () => {
      ativo = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  function limparPreview() {
    if (imagemPreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagemPreview);
    }

    setImagemPreview("");
    setImagemArquivo(null);
  }

  async function entrar(e) {
    e.preventDefault();
    setMensagem("Verificando acesso...");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha
    });

    if (error) {
      setMensagem("Não foi possível entrar. Confira o e-mail e a senha.");
    } else {
      setMensagem("Login realizado com sucesso!");
      setSenha("");
    }
  }

  async function sair() {
    await supabase.auth.signOut();

    setSession(null);
    cancelarEdicao();
    setMensagem("Você saiu do painel.");
  }

  function atualizarCampo(campo, valor) {
    setNovo((atual) => ({
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

    if (imagemPreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagemPreview);
    }

    setImagemArquivo(arquivo);
    setImagemPreview(URL.createObjectURL(arquivo));
    setMensagem("Imagem selecionada! Confira a prévia.");
  }

  function iniciarEdicao(produto) {
    limparPreview();

    setEditandoId(produto.id);

    setNovo({
      nome: produto.nome,
      descricao: produto.descricao,
      categoria: produto.categoria,
      plataforma: produto.plataforma,
      icone: produto.icone,
      link: produto.link,
      imagem: produto.imagem
    });

    setImagemPreview(produto.imagem || "");
    setMensagem("Editando: " + produto.nome);

    document.querySelector(".painel-admin")?.scrollIntoView({
      behavior: "smooth"
    });
  }

  function cancelarEdicao() {
    limparPreview();
    setEditandoId(null);
    setNovo({ ...produtoVazio });
  }

  async function enviarImagem() {
    if (!imagemArquivo) {
      return novo.imagem || null;
    }

    const nomeArquivo = imagemArquivo.name.replace(
      /[^a-zA-Z0-9._-]/g,
      "-"
    );

    const caminho = `downloads/${Date.now()}-${nomeArquivo}`;

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

  async function salvarProduto(e) {
    e.preventDefault();

    if (!session || salvando) return;

    setSalvando(true);
    setMensagem("Salvando download e imagem...");

    try {
      const urlImagem = await enviarImagem();

      const dados = {
        title: novo.nome.trim(),
        description: novo.descricao.trim(),
        category: novo.categoria,
        platform: novo.plataforma.trim() || "Windows",
        icon: novo.icone.trim() || "📦",
        download_url: novo.link.trim(),
        image_url: urlImagem
      };

      let resultado;

      if (editandoId) {
        resultado = await supabase
          .from("downloads")
          .update(dados)
          .eq("id", editandoId);
      } else {
        resultado = await supabase
          .from("downloads")
          .insert([dados]);
      }

      if (resultado.error) {
        throw new Error(resultado.error.message);
      }

      setMensagem(
        editandoId
          ? "Download atualizado com sucesso!"
          : "Download cadastrado com sucesso!"
      );

      cancelarEdicao();
      await carregarProdutos();

    } catch (error) {
      setMensagem(error.message);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id) {
    if (!session) return;

    const confirmar = window.confirm(
      "Deseja realmente excluir este download?"
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("downloads")
      .delete()
      .eq("id", id);

    if (error) {
      setMensagem("Erro ao excluir: " + error.message);
      return;
    }

    if (editandoId === id) {
      cancelarEdicao();
    }

    setMensagem("Download excluído com sucesso!");
    await carregarProdutos();
  }

  const categorias = [
    "Todos",
    ...new Set(produtos.map((p) => p.categoria))
  ];

  const filtrados = produtos.filter((p) => {
    const termo = pesquisa.toLowerCase();

    const correspondePesquisa =
      p.nome.toLowerCase().includes(termo) ||
      p.descricao.toLowerCase().includes(termo);

    const correspondeCategoria =
      categoriaAtiva === "Todos" ||
      p.categoria === categoriaAtiva;

    return correspondePesquisa && correspondeCategoria;
  });

  if (carregando) {
    return (
      <div className="site">
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
          onClick={() => setAdmin(!admin)}
        >
          {admin ? "Fechar painel" : "Área do Administrador"}
        </button>
      </header>

      <section className="banner-principal">
  <img
    src={`${import.meta.env.BASE_URL}banner.png`}
    alt="MANINHO DOWNLOADS"
    style={{
      display: "block",
      width: "100%",
      height: "auto",
      borderRadius: "18px"
    }}
  />
</section>

      <section className="vantagens">
        <div>⚡ Downloads rápidos</div>
        <div>🛡️ Links organizados</div>
        <div>💻 Vários dispositivos</div>
      </section>

      {admin && (
        <section className="painel-admin">
          <h2 className="subtitulo">
            🔐 Painel administrativo
          </h2>

          {!session ? (
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
                <p>
                  Administrador conectado: {session.user.email}
                </p>

                <button type="button" onClick={sair}>
                  Sair
                </button>
              </div>

              <h3>
                {editandoId
                  ? "✏️ Editar download"
                  : "➕ Adicionar novo download"}
              </h3>

              <form
                className="form-produto"
                onSubmit={salvarProduto}
              >
                <input
                  placeholder="Nome do arquivo"
                  value={novo.nome}
                  onChange={(e) =>
                    atualizarCampo("nome", e.target.value)
                  }
                  required
                />

                <input
                  placeholder="Descrição"
                  value={novo.descricao}
                  onChange={(e) =>
                    atualizarCampo("descricao", e.target.value)
                  }
                />

                <select
                  value={novo.categoria}
                  onChange={(e) =>
                    atualizarCampo("categoria", e.target.value)
                  }
                >
                  <option>Aplicativos</option>
                  <option>Programas</option>
                  <option>Jogos</option>
                  <option>Emuladores</option>
                  <option>Outros</option>
                </select>

                <input
                  placeholder="Plataforma (Windows, Android...)"
                  value={novo.plataforma}
                  onChange={(e) =>
                    atualizarCampo("plataforma", e.target.value)
                  }
                />

                <input
                  placeholder="Ícone ou emoji"
                  value={novo.icone}
                  onChange={(e) =>
                    atualizarCampo("icone", e.target.value)
                  }
                />

                <input
                  type="url"
                  placeholder="Link para baixar"
                  value={novo.link}
                  onChange={(e) =>
                    atualizarCampo("link", e.target.value)
                  }
                  required
                />

                <div className="campo-imagem">
                  <label htmlFor="arquivo-imagem">
                    🖼️ Escolher imagem do computador
                  </label>

                  <input
                    id="arquivo-imagem"
                    type="file"
                    accept="image/*"
                    onChange={escolherImagem}
                  />

                  <small>
                    Escolha uma imagem do computador.
                    Tamanho máximo: 5 MB.
                  </small>

                  {imagemPreview && (
                    <div className="imagem-preview">
                      <img
                        src={imagemPreview}
                        alt="Prévia da imagem selecionada"
                      />

                      <button
                        type="button"
                        onClick={() => {
                          limparPreview();

                          setNovo((atual) => ({
                            ...atual,
                            imagem: ""
                          }));
                        }}
                      >
                        Remover imagem
                      </button>
                    </div>
                  )}
                </div>

                <button type="submit" disabled={salvando}>
                  {salvando
                    ? "Enviando..."
                    : editandoId
                    ? "💾 Salvar alterações"
                    : "➕ Adicionar download"}
                </button>

                {editandoId && (
                  <button
                    type="button"
                    onClick={cancelarEdicao}
                  >
                    Cancelar edição
                  </button>
                )}
              </form>

              <h3>Gerenciar downloads</h3>

              <div className="admin-lista">
                {produtos.map((p) => (
                  <div className="admin-item" key={p.id}>
                    <span>
                      {p.icone} {p.nome}
                    </span>

                    <div className="admin-acoes">
                      <button
                        className="botao-editar"
                        type="button"
                        onClick={() => iniciarEdicao(p)}
                      >
                        ✏️ Editar
                      </button>

                      <button
                        className="botao-excluir"
                        type="button"
                        onClick={() => excluir(p.id)}
                      >
                        🗑️ Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {mensagem && (
            <p className="aviso-admin">{mensagem}</p>
          )}
        </section>
      )}

      <main className="catalogo">
        <h2 className="titulo-secao">
          Explore nossos downloads
        </h2>

        <p className="contador">
          {filtrados.length} downloads disponíveis
        </p>

        <input
          className="pesquisa"
          placeholder="🔎 Pesquisar downloads..."
          value={pesquisa}
          onChange={(e) => setPesquisa(e.target.value)}
        />

        <div className="filtros">
          {categorias.map((categoria) => (
            <button
              key={categoria}
              className={`filtro ${
                categoriaAtiva === categoria ? "ativo" : ""
              }`}
              onClick={() => setCategoriaAtiva(categoria)}
            >
              {categoria}
            </button>
          ))}
        </div>

        <div className="grade">
          {filtrados.map((p) => (
            <article className="card" key={p.id}>
              <div className="capa">
                {p.imagem ? (
                  <img
                    className="capa-imagem"
                    src={p.imagem}
                    alt={p.nome}
                  />
                ) : (
                  <span className="azul">{p.icone}</span>
                )}
              </div>

              <div className="card-info">
                <span className="etiqueta">
                  {p.categoria}
                </span>

                <h3>{p.nome}</h3>
                <p>{p.descricao}</p>

                <div className="card-rodape">
                  <span>{p.plataforma}</span>

                  <a
                    href={p.link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Baixar ↗
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>

        {filtrados.length === 0 && (
          <p className="vazio">
            Nenhum download encontrado.
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