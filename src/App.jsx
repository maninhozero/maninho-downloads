
import { useEffect, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate
} from "react-router-dom";
import { supabase } from "./supabase";
import Player from "./Player.jsx";
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

const canaisEsportivos = [
  { nome: "ESPN", url: "https://nphd.online/tv/espn" },
  { nome: "ESPN 2", url: "https://nphd.online/tv/espn2" },
  { nome: "Premiere", url: "https://nphd.online/tv/premiere" },
  { nome: "TNT Sports", url: "https://nphd.online/tv/tnt" },
  { nome: "Prime Video 4", url: "https://nphd.online/tv/primevideo4" },
  { nome: "Prime Video", url: "https://nphd.online/tv/primevideo" },
  { nome: "SporTV", url: "https://nphd.online/tv/sportv" },
  { nome: "SporTV 2", url: "https://nphd.online/tv/sportv2" },
  { nome: "ESPN 3", url: "https://nphd.online/tv/espn3" },
  { nome: "Premiere 3", url: "https://nphd.online/tv/premiere3" },
  { nome: "Paramount+", url: "https://nphd.online/tv/paramountplus" }
];

const LIGAS_PERMITIDAS = {
  71: "Brasileirão Série A",
  73: "Copa do Brasil",
  13: "Libertadores",
  11: "Sul-Americana",
  2: "Champions League",
  39: "Premier League",
  140: "La Liga"
};

function urlValida(valor) {
  try {
    const url = new URL(valor);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function horarioPartida(data) {
  if (!data) return "--:--";

  return new Date(data).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo"
  });
}

function dataHoje() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function statusPartida(status) {
  const estados = {
    TBD: "A definir",
    NS: "Não iniciada",
    "1H": "1º tempo",
    HT: "Intervalo",
    "2H": "2º tempo",
    ET: "Prorrogação",
    P: "Pênaltis",
    FT: "Encerrado",
    AET: "Encerrado",
    PEN: "Pênaltis",
    PST: "Adiado",
    CANC: "Cancelado",
    ABD: "Interrompido",
    AWD: "Resultado administrativo",
    WO: "W.O.",
    LIVE: "Ao vivo"
  };

  return estados[status] || status || "Status indisponível";
}

function BotoesConteudo({ item, aoAbrirPlayer, textoPlayer, textoNovaAba }) {
  return (
    <div className="acoes-conteudo">
      <button
        type="button"
        className="botao-player-card"
        onClick={() => aoAbrirPlayer(item)}
      >
        ▶ {textoPlayer || "Abrir no site"}
      </button>

      <a
        className="botao-nova-aba"
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
      >
        ↗ {textoNovaAba || "Abrir em nova aba"}
      </a>
    </div>
  );
}

function Home() {
  const navegar = useNavigate();

  const [produtos, setProdutos] = useState([]);
  const [canais, setCanais] = useState([]);

  const [jogos, setJogos] = useState([]);
  const [carregandoJogos, setCarregandoJogos] = useState(false);
  const [erroJogos, setErroJogos] = useState("");
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState("");

  const [transmissoes, setTransmissoes] = useState([]);
  const [jogoSelecionadoId, setJogoSelecionadoId] = useState("");
  const [canaisSelecionados, setCanaisSelecionados] = useState([]);

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

  function abrirNoPlayer(item) {
    if (!item?.link || !urlValida(item.link)) {
      alert("Este conteúdo não possui um endereço válido.");
      return;
    }

    const destino =
      `/assistir?url=${encodeURIComponent(item.link)}` +
      `&titulo=${encodeURIComponent(item.nome || "Conteúdo")}`;

    navegar(destino);
  }

  async function carregarProdutos() {
    const { data, error } = await supabase
      .from("downloads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMensagem("Erro ao carregar downloads: " + error.message);
      return;
    }

    setProdutos((data || []).map((item) => ({
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

  async function carregarCanais() {
    const { data, error } = await supabase
      .from("canais")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMensagem("Erro ao carregar canais: " + error.message);
      return;
    }

    setCanais((data || []).map((item) => ({
      id: item.id,
      nome: item.nome,
      descricao: item.descricao || "",
      categoria: item.categoria || "TV",
      imagem: item.logo_url || "",
      link: item.stream_url
    })));
  }

  async function carregarJogos() {
    setCarregandoJogos(true);
    setErroJogos("");

    try {
      const { data, error } = await supabase.functions.invoke(
        "jogos-do-dia",
        { body: {} }
      );

      if (error) {
        throw new Error(error.message || "Não foi possível consultar a função.");
      }

      if (data?.error) throw new Error(data.error);

      if (!Array.isArray(data?.data)) {
        throw new Error("A API não retornou uma lista válida de partidas.");
      }

      const jogosPermitidos = data.data
        .filter((jogo) =>
          Object.prototype.hasOwnProperty.call(
            LIGAS_PERMITIDAS,
            Number(jogo.league?.id)
          )
        )
        .map((jogo) => ({
          ...jogo,
          league: {
            ...jogo.league,
            name: LIGAS_PERMITIDAS[Number(jogo.league?.id)]
          }
        }));

      setJogos(jogosPermitidos);

      setUltimaAtualizacao(new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
      }));
    } catch (error) {
      setErroJogos(error.message || "Erro ao consultar os jogos.");
    } finally {
      setCarregandoJogos(false);
    }
  }

  async function carregarTransmissoes() {
    const { data, error } = await supabase
      .from("transmissoes_jogos")
      .select("*");

    if (error) {
      setMensagem("Erro ao carregar transmissões: " + error.message);
      return;
    }

    setTransmissoes(data || []);
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
        carregarCanais(),
        carregarJogos(),
        carregarTransmissoes()
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
    if (!imagemArquivo) return imagemAtual || "";

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
      const imagem = await enviarImagem("downloads", novoProduto.imagem);

      const dados = {
        title: novoProduto.nome.trim(),
        description: novoProduto.descricao.trim(),
        category: novoProduto.categoria,
        platform: novoProduto.plataforma.trim() || "Windows",
        icon: novoProduto.icone.trim() || "📦",
        download_url: novoProduto.link.trim(),
        image_url: imagem
      };

      const resultado = editandoDownloadId
        ? await supabase.from("downloads").update(dados).eq("id", editandoDownloadId)
        : await supabase.from("downloads").insert([dados]);

      if (resultado.error) throw resultado.error;

      setMensagem(editandoDownloadId ? "Download atualizado!" : "Download cadastrado!");
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
      setMensagem("Informe um endereço válido para o canal.");
      return;
    }

    if (novoCanal.logo_url.trim() && !urlValida(novoCanal.logo_url)) {
      setMensagem("O endereço do logotipo não é válido.");
      return;
    }

    setSalvando(true);
    setMensagem("Salvando canal...");

    try {
      const imagem = await enviarImagem("canais", novoCanal.logo_url);

      const dados = {
        nome: novoCanal.nome.trim(),
        descricao: novoCanal.descricao.trim(),
        categoria: novoCanal.categoria,
        logo_url: imagem,
        stream_url: novoCanal.stream_url.trim()
      };

      const resultado = editandoCanalId
        ? await supabase.from("canais").update(dados).eq("id", editandoCanalId)
        : await supabase.from("canais").insert([dados]);

      if (resultado.error) throw resultado.error;

      setMensagem(editandoCanalId ? "Canal atualizado!" : "Canal cadastrado!");
      cancelarEdicao();
      await carregarCanais();
    } catch (error) {
      setMensagem("Erro: " + error.message);
    } finally {
      setSalvando(false);
    }
  }

  function selecionarJogoTransmissao(id) {
    setJogoSelecionadoId(id);

    const salva = transmissoes.find(
      (item) => String(item.fixture_id) === String(id)
    );

    setCanaisSelecionados(salva?.canais || []);
  }

  function alternarCanalTransmissao(canal) {
    setCanaisSelecionados((atuais) => {
      const existe = atuais.some((item) => item.nome === canal.nome);

      return existe
        ? atuais.filter((item) => item.nome !== canal.nome)
        : [...atuais, canal];
    });
  }

  async function salvarTransmissao() {
    if (!adminAutorizado || salvando) return;

    const jogo = jogos.find(
      (item) => String(item.fixture?.id) === String(jogoSelecionadoId)
    );

    if (!jogo) {
      setMensagem("Selecione uma partida válida.");
      return;
    }

    if (canaisSelecionados.length === 0) {
      setMensagem("Marque pelo menos um canal.");
      return;
    }

    setSalvando(true);
    setMensagem("Salvando canais da partida...");

    const dados = {
      fixture_id: jogo.fixture.id,
      fixture_date: jogo.fixture.date?.slice(0, 10) || null,
      mandante: jogo.teams?.home?.name || "Time da casa",
      visitante: jogo.teams?.away?.name || "Time visitante",
      canais: canaisSelecionados,
      updated_at: new Date().toISOString()
    };

    try {
      const { error } = await supabase
        .from("transmissoes_jogos")
        .upsert(dados, { onConflict: "fixture_id" });

      if (error) throw error;

      setMensagem("Canais associados à partida com sucesso!");
      await carregarTransmissoes();
    } catch (error) {
      setMensagem("Erro ao salvar transmissão: " + error.message);
    } finally {
      setSalvando(false);
    }
  }

  async function excluirTransmissao(id) {
    if (!adminAutorizado) return;

    if (!window.confirm("Deseja remover os canais desta partida?")) return;

    const { error } = await supabase
      .from("transmissoes_jogos")
      .delete()
      .eq("fixture_id", id);

    if (error) {
      setMensagem("Erro ao remover: " + error.message);
      return;
    }

    setMensagem("Associação removida!");
    await carregarTransmissoes();

    if (String(jogoSelecionadoId) === String(id)) {
      setJogoSelecionadoId("");
      setCanaisSelecionados([]);
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

    const { error } = await supabase.from("downloads").delete().eq("id", id);

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

    const { error } = await supabase.from("canais").delete().eq("id", id);

    if (error) {
      setMensagem("Erro ao excluir: " + error.message);
      return;
    }

    setMensagem("Canal excluído!");
    await carregarCanais();
  }

  const listaAtual = area === "downloads"
    ? produtos
    : area === "canais"
      ? canais
      : [];

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
      categoriaAtiva === "Todos" || item.categoria === categoriaAtiva;

    return correspondePesquisa && correspondeCategoria;
  });

  function mudarArea(novaArea) {
    setArea(novaArea);
    setCategoriaAtiva("Todos");
    setPesquisa("");
  }

  function canaisDaPartida(fixtureId) {
    return transmissoes.find(
      (item) => String(item.fixture_id) === String(fixtureId)
    )?.canais || [];
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
          <span>MANINHO <strong>DOWNLOADS</strong></span>
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
          <p>Downloads, jogos, aplicativos, futebol e canais em um só lugar.</p>
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
          📺 Canais
        </button>

        <button
          className={area === "futebol" ? "selecionado" : ""}
          onClick={() => mudarArea("futebol")}
        >
          ⚽ Futebol de hoje
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

                <button
                  className={tipoAdmin === "transmissoes" ? "selecionado" : ""}
                  onClick={() => {
                    cancelarEdicao();
                    setTipoAdmin("transmissoes");
                    setJogoSelecionadoId("");
                    setCanaisSelecionados([]);
                  }}
                >
                  ⚽ Associar canais às partidas
                </button>
              </div>

              {tipoAdmin === "downloads" ? (
                <>
                  <h3>{editandoDownloadId ? "✏️ Editar download" : "➕ Adicionar download"}</h3>

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
                      <label htmlFor="imagem-admin">🖼️ Escolher imagem</label>

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
                      <button type="button" onClick={cancelarEdicao}>Cancelar</button>
                    )}
                  </form>

                  <h3>Downloads cadastrados</h3>

                  <div className="admin-lista">
                    {produtos.map((p) => (
                      <div className="admin-item" key={p.id}>
                        <span>{p.icone} {p.nome}</span>

                        <div className="admin-acoes">
                          <button className="botao-editar" onClick={() => iniciarEdicaoDownload(p)}>
                            ✏️ Editar
                          </button>
                          <button className="botao-excluir" onClick={() => excluirDownload(p.id)}>
                            🗑️ Excluir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : tipoAdmin === "canais" ? (
                <>
                  <h3>{editandoCanalId ? "✏️ Editar canal" : "➕ Adicionar canal"}</h3>

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
                      placeholder="Link do canal autorizado"
                      value={novoCanal.stream_url}
                      onChange={(e) => atualizarCanal("stream_url", e.target.value)}
                      required
                    />

                    <div className="campo-imagem">
                      <label htmlFor="imagem-canal">🖼️ Enviar logotipo do computador</label>
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
                      <button type="button" onClick={cancelarEdicao}>Cancelar</button>
                    )}
                  </form>

                  <h3>Canais cadastrados</h3>

                  <div className="admin-lista">
                    {canais.map((c) => (
                      <div className="admin-item" key={c.id}>
                        <span>📺 {c.nome}</span>

                        <div className="admin-acoes">
                          <button className="botao-editar" onClick={() => iniciarEdicaoCanal(c)}>
                            ✏️ Editar
                          </button>
                          <button className="botao-excluir" onClick={() => excluirCanal(c.id)}>
                            🗑️ Excluir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <h3>⚽ Associar canais às partidas</h3>

                  <p className="contador">
                    Escolha uma partida e marque somente os canais com transmissão confirmada.
                  </p>

                  <div className="form-produto">
                    <select
                      value={jogoSelecionadoId}
                      onChange={(e) => selecionarJogoTransmissao(e.target.value)}
                    >
                      <option value="">Selecione uma partida</option>

                      {jogos.map((jogo) => (
                        <option key={jogo.fixture?.id} value={jogo.fixture?.id}>
                          {jogo.teams?.home?.name} x {jogo.teams?.away?.name}
                        </option>
                      ))}
                    </select>

                    {jogoSelecionadoId && (
                      <>
                        <h3>Marque os canais</h3>

                        <div className="admin-lista">
                          {canaisEsportivos.map((canal) => (
                            <label key={canal.nome} className="admin-item" style={{ cursor: "pointer" }}>
                              <span>
                                <input
                                  type="checkbox"
                                  checked={canaisSelecionados.some((item) => item.nome === canal.nome)}
                                  onChange={() => alternarCanalTransmissao(canal)}
                                />
                                {" "}{canal.nome}
                              </span>
                            </label>
                          ))}
                        </div>

                        <button type="button" onClick={salvarTransmissao} disabled={salvando}>
                          {salvando ? "Salvando..." : "💾 Salvar canais da partida"}
                        </button>
                      </>
                    )}
                  </div>

                  <h3>Associações cadastradas</h3>

                  <div className="admin-lista">
                    {transmissoes.map((item) => (
                      <div className="admin-item" key={item.fixture_id}>
                        <span>⚽ {item.mandante} x {item.visitante}</span>
                        <button
                          className="botao-excluir"
                          type="button"
                          onClick={() => excluirTransmissao(item.fixture_id)}
                        >
                          🗑️ Remover
                        </button>
                      </div>
                    ))}

                    {transmissoes.length === 0 && (
                      <p className="vazio">Nenhuma associação cadastrada.</p>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {mensagem && <p className="aviso-admin">{mensagem}</p>}
        </section>
      )}

      {area === "futebol" ? (
        <main className="catalogo">
          <h2 className="titulo-secao">⚽ Futebol de hoje</h2>

          <p className="contador">
            Partidas de {new Date(`${dataHoje()}T12:00:00`).toLocaleDateString("pt-BR")}
          </p>

          <button type="button" onClick={carregarJogos} disabled={carregandoJogos}>
            {carregandoJogos ? "Consultando jogos..." : "🔄 Atualizar partidas"}
          </button>

          {ultimaAtualizacao && (
            <p className="contador">Última consulta: {ultimaAtualizacao}</p>
          )}

          {erroJogos && <p className="vazio">⚠️ {erroJogos}</p>}

          {carregandoJogos && <p className="vazio">Buscando partidas do dia...</p>}

          {!carregandoJogos && !erroJogos && jogos.length === 0 && (
            <p className="vazio">Nenhuma partida encontrada para hoje.</p>
          )}

          <div className="grade">
            {jogos.map((jogo) => {
              const canaisDoJogo = canaisDaPartida(jogo.fixture?.id);

              return (
                <article className="card" key={jogo.fixture?.id}>
                  <div className="card-info">
                    <span className="etiqueta">{jogo.league?.name || "Campeonato"}</span>
                    <p>{jogo.league?.country || ""}</p>

                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "10px",
                      margin: "18px 0"
                    }}>
                      <div style={{ textAlign: "center", flex: 1 }}>
                        {jogo.teams?.home?.logo && (
                          <img src={jogo.teams.home.logo} alt="" loading="lazy" style={{
                            width: "48px",
                            height: "48px",
                            objectFit: "contain"
                          }} />
                        )}
                        <h3>{jogo.teams?.home?.name || "Time da casa"}</h3>
                      </div>

                      <div style={{ textAlign: "center", minWidth: "55px" }}>
                        <strong>{jogo.goals?.home ?? "-"} x {jogo.goals?.away ?? "-"}</strong>
                        <p>{horarioPartida(jogo.fixture?.date)}</p>
                      </div>

                      <div style={{ textAlign: "center", flex: 1 }}>
                        {jogo.teams?.away?.logo && (
                          <img src={jogo.teams.away.logo} alt="" loading="lazy" style={{
                            width: "48px",
                            height: "48px",
                            objectFit: "contain"
                          }} />
                        )}
                        <h3>{jogo.teams?.away?.name || "Time visitante"}</h3>
                      </div>
                    </div>

                    <p>Status: {statusPartida(jogo.fixture?.status?.short)}</p>
                    <p>Estádio: {jogo.fixture?.venue?.name || "Não informado"}</p>

                    <div style={{ marginTop: "15px" }}>
                      <h3>📺 Onde assistir</h3>

                      {canaisDoJogo.length > 0 ? (
                        <div className="acoes-conteudo">
                          {canaisDoJogo.map((canal) => (
                            <BotoesConteudo
                              key={canal.nome}
                              item={{ nome: canal.nome, link: canal.url }}
                              aoAbrirPlayer={abrirNoPlayer}
                              textoPlayer="Assistir"
                              textoNovaAba="Nova aba"
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="contador">Transmissão ainda não cadastrada.</p>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <section style={{ marginTop: "35px" }}>
            <h2 className="titulo-secao">📺 Canais esportivos</h2>
            <p className="contador">
              Consulte a programação oficial para confirmar a transmissão de cada partida.
            </p>

            <div className="grade">
              {canaisEsportivos.map((canal) => (
                <article className="card" key={canal.nome}>
                  <div className="card-info">
                    <span className="etiqueta">Esportes</span>
                    <h3>{canal.nome}</h3>

                    <BotoesConteudo
                      item={{ nome: canal.nome, link: canal.url }}
                      aoAbrirPlayer={abrirNoPlayer}
                      textoPlayer="Assistir no site"
                      textoNovaAba="Nova aba"
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>
        </main>
      ) : (
        <main className="catalogo">
          <h2 className="titulo-secao">
            {area === "downloads" ? "Explore nossos downloads" : "Canais cadastrados"}
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

          <div className="grade">
            {filtrados.map((p) => (
              <article className="card" key={p.id}>
                <div className="capa">
                  {p.imagem ? (
                    <img className="capa-imagem" src={p.imagem} alt={p.nome} loading="lazy" />
                  ) : (
                    <span className="azul">{area === "downloads" ? "📦" : "📺"}</span>
                  )}
                </div>

                <div className="card-info">
                  <span className="etiqueta">{p.categoria}</span>
                  <h3>{p.nome}</h3>
                  <p>{p.descricao}</p>

                  <div className="card-rodape">
                    <span>{area === "downloads" ? p.plataforma : "Canal"}</span>
                  </div>

                  <BotoesConteudo
                    item={{ nome: p.nome, link: p.link }}
                    aoAbrirPlayer={abrirNoPlayer}
                    textoPlayer={area === "downloads" ? "Abrir no player" : "Assistir no site"}
                    textoNovaAba={area === "downloads" ? "Baixar / nova aba" : "Nova aba"}
                  />
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
      )}

      <footer className="sobre">
        <p>
          © {new Date().getFullYear()} MANINHO DOWNLOADS — Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/assistir" element={<Player />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
