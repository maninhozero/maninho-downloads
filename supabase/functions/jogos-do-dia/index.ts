
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Somente estes sete campeonatos serão exibidos.
const campeonatosPermitidos: Record<number, string> = {
  71: "Brasileirão Série A",
  73: "Copa do Brasil",
  13: "Libertadores",
  11: "Sul-Americana",
  2: "Champions League",
  39: "Premier League",
  140: "La Liga",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const apiKey = Deno.env.get("API_FOOTBALL_KEY");

    if (!apiKey) {
      throw new Error("API_FOOTBALL_KEY não configurada.");
    }

    const hoje = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const resposta = await fetch(
      `https://v3.football.api-sports.io/fixtures?date=${hoje}&timezone=America%2FSao_Paulo`,
      {
        method: "GET",
        headers: {
          "x-apisports-key": apiKey,
        },
      }
    );

    if (!resposta.ok) {
      throw new Error(`Erro na API de futebol: ${resposta.status}`);
    }

    const dados = await resposta.json();

    if (dados.errors && Object.keys(dados.errors).length > 0) {
      throw new Error("A API retornou um erro na consulta.");
    }

    const jogosFiltrados = (dados.response || [])
      .filter((jogo: any) => {
        const ligaId = Number(jogo.league?.id);

        return Object.prototype.hasOwnProperty.call(
          campeonatosPermitidos,
          ligaId
        );
      })
      .map((jogo: any) => {
        const ligaId = Number(jogo.league?.id);

        return {
          ...jogo,
          league: {
            ...jogo.league,
            name: campeonatosPermitidos[ligaId],
          },
        };
      });

    return new Response(
      JSON.stringify({
        data: jogosFiltrados,
        total: jogosFiltrados.length,
        date: hoje,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (erro) {
    return new Response(
      JSON.stringify({
        error:
          erro instanceof Error
            ? erro.message
            : "Erro desconhecido.",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
