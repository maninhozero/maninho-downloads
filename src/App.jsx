
import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import "./App.css";

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

  const [novo, setNovo] = useState({
    nome: "",
    descricao: "",
    categoria: "Aplicativos",
    plataforma: "Windows",
    icone: "📦",
    link: "",
    imagem: ""
  });

  async function carregarProdutos() {
    const { data, error } = await supabase
      .from("downloads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMensagem("Erro ao carregar downloads: " + error.message);
      return;
    }

    setProdutos(data.map((item) => ({
      id: item.id,
      nome: item.title,
      descricao: item.description || "",
      categoria: item.category || "Outros",
      plataforma: item.platform || "Windows",
      icone: item.icon || "📦",
      link: item.download_url,
      imagem: item.image_url || ""
    })));
  }

  useEffect(() => {
    let ativo = true;

    async function iniciar() {
      const { data } = await supabase.auth.getSession();

      if (ativo) {
        setSession(data.session);
        await carregarProdutos();
        setCarregando(false);
      }
    }

    iniciar();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, sessionAtual) => {
        if (ativo) setSession(sessionAtual);
      }
    );

    return () => {
      ativo = false;
      listener.subscription.unsubscribe();
    };
  }, []);

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
      setMensagem("Login realizado!");
      setSenha("");
    }
  }

  async function sair() {
    await supabase.auth.signOut();
    setAdmin(false);
    setMensagem("Você saiu do painel.");
  }

  async function adicionar(e) {
    e.preventDefault();

    if (!session) {
      setMensagem("Entre como administrador primeiro.");
      return;
    }

    const { error } = await supabase.from("downloads").insert([{
      title: novo.nome,
      description: novo.descricao,
      category: novo.categoria,
      platform: novo.plataforma,
      icon: novo.icone,
      download_url: novo.link,
      image_url: novo.imagem || null
    }]);

    if (error) {
      setMensagem("Erro ao cadastrar: " + error.message);
      return;
    }

    setNovo({
      nome: "",
      descricao: "",
      categoria: "Aplicativos",
      plataforma: "Windows",
      icone: "📦",
      link: "",
      imagem: ""
    });

    setMensagem("Download cadastrado com sucesso!");
    await carregarProdutos();
  }

  async function excluir(id) {
    if (!session) return;

    if (!window.confirm("Deseja realmente excluir este download?")) return;

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

  const categorias = [
    "Todos",
    ...new Set(produtos.map((p) => p.categoria))
  ];

  const filtrados = produtos.filter((p) => {
    const correspondePesquisa =
      p.nome.toLowerCase().includes(pesquisa.toLowerCase()) ||
      p.descricao.toLowerCase().includes(pesquisa.toLowerCase());

    const correspondeCategoria =
      categoriaAtiva === "Todos" || p.categoria === categoriaAtiva;

    return correspondePesquisa && correspondeCategoria;
  });

  if (carregando) {
    return <div className="site"><h2>Carregando MANINHO DOWNLOADS...</h2></div>;
  }

  return (
    <div className="site">
      <header className="topo">
        <div className="logo">
          <span className="logo-icon">🎮</span>
          <span>MANINHO <strong>DOWNLOADS</strong></span>
        </div>

        <button
          className="admin-botao"
          onClick={() => setAdmin(!admin)}
        >
          {admin ? "Fechar painel" : "Área do Administrador"}
        </button>
      </header>

      <section className="hero">
        <div className="hero-texto">
          <span className="etiqueta">SEU PORTAL DE DOWNLOADS</span>
          <h1>MANINHO DOWNLOADS</h1>
          <p>Seus aplicativos, programas e jogos favoritos em um só lugar.</p>
        </div>

        <div className="hero-arte">
          <div className="circulo">🎮</div>
          <p className="arte-legenda">DOWNLOADS • JOGOS • PROGRAMAS</p>
        </div>
      </section>

      <section className="vantagens">
        <div>⚡ Downloads rápidos</div>
        <div>🛡️ Links organizados</div>
        <div>💻 Vários dispositivos</div>
      </section>

      {admin && (
        <section className="painel-admin">
          <h2 className="subtitulo">🔐 Painel administrativo</h2>

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
                <p>Administrador conectado: {session.user.email}</p>
                <button type="button" onClick={sair}>Sair</button>
              </div>

              <h3>Adicionar novo download</h3>

              <form className="form-produto" onSubmit={adicionar}>
                <input
                  placeholder="Nome do arquivo"
                  value={novo.nome}
                  onChange={(e) => setNovo({...novo, nome: e.target.value})}
                  required
                />

                <input
                  placeholder="Descrição"
                  value={novo.descricao}
                  onChange={(e) => setNovo({...novo, descricao: e.target.value})}
                />

                <select
                  value={novo.categoria}
                  onChange={(e) => setNovo({...novo, categoria: e.target.value})}
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
                  onChange={(e) => setNovo({...novo, plataforma: e.target.value})}
                />

                <input
                  placeholder="Ícone ou emoji"
                  value={novo.icone}
                  onChange={(e) => setNovo({...novo, icone: e.target.value})}
                />

                <input
                  type="url"
                  placeholder="Link para baixar"
                  value={novo.link}
                  onChange={(e) => setNovo({...novo, link: e.target.value})}
                  required
                />

                <input
                  type="url"
                  placeholder="Link da imagem (opcional)"
                  value={novo.imagem}
                  onChange={(e) => setNovo({...novo, imagem: e.target.value})}
                />

                <button type="submit">➕ Adicionar download</button>
              </form>

              <h3>Gerenciar downloads</h3>

              <div className="admin-lista">
                {produtos.map((p) => (
                  <div className="admin-item" key={p.id}>
                    <span>{p.icone} {p.nome}</span>
                    <button onClick={() => excluir(p.id)}>Excluir</button>
                  </div>
                ))}
              </div>
            </>
          )}

          {mensagem && <p className="aviso-admin">{mensagem}</p>}
        </section>
      )}

      <main className="catalogo">
        <h2 className="titulo-secao">Explore nossos downloads</h2>
        <p className="contador">{filtrados.length} downloads disponíveis</p>

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
              className={`filtro ${categoriaAtiva === categoria ? "ativo" : ""}`}
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
                  <img className="capa-imagem" src={p.imagem} alt={p.nome} />
                ) : (
                  <span className="azul">{p.icone}</span>
                )}
              </div>

              <div className="card-info">
                <span className="etiqueta">{p.categoria}</span>
                <h3>{p.nome}</h3>
                <p>{p.descricao}</p>
                <div className="card-rodape">
                  <span>{p.plataforma}</span>
                  <a href={p.link} target="_blank" rel="noopener noreferrer">
                    Baixar ↗
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>

        {filtrados.length === 0 && (
          <p className="vazio">Nenhum download encontrado.</p>
        )}
      </main>

      <footer className="sobre">
        <p>© {new Date().getFullYear()} MANINHO DOWNLOADS — Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
