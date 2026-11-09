// Tamanho do mapa e chave usada para salvar a cidade no navegador
const LINHAS = 8;
const COLUNAS = 12;
const CHAVE_CIDADE = "dragCitCityV1";

// Tipos de construção disponíveis e suas cores iniciais
const tiposConstrucao = [
  { id: "house", nome: "Casa", descricao: "Moradia", cor: "#c85e4d", abreviacao: "C" },
  { id: "apartment", nome: "Prédio", descricao: "Moradia coletiva", cor: "#5688ab", abreviacao: "P" },
  { id: "hospital", nome: "Hospital", descricao: "Saúde e atendimento", cor: "#c95050", abreviacao: "+" },
  { id: "shop", nome: "Loja", descricao: "Comércio local", cor: "#bc6a4f", abreviacao: "L" },
  { id: "school", nome: "Escola", descricao: "Educação", cor: "#8061a2", abreviacao: "E" },
  { id: "park", nome: "Parque", descricao: "Lazer e natureza", cor: "#398657", abreviacao: "P" },
  { id: "tree", nome: "Árvore", descricao: "Área verde", cor: "#398657", abreviacao: "A" },
  { id: "police", nome: "Delegacia", descricao: "Segurança pública", cor: "#5075a8", abreviacao: "D" },
  { id: "fire", nome: "Bombeiros", descricao: "Emergência e resgate", cor: "#c75c3b", abreviacao: "B" },
  { id: "road", nome: "Rua", descricao: "Mobilidade urbana", cor: "#687874", abreviacao: "R" }
];

// Elementos que o JavaScript atualiza na página
const catalogo = document.getElementById("catalog");
const mapaDeLotes = document.getElementById("tiles");
const mapaDeConstrucoes = document.getElementById("buildings");
const listaDeConstrucoes = document.getElementById("buildingList");
const formulario = document.getElementById("buildingForm");
const janela = document.getElementById("buildingDialog");

let cidade = carregarCidade();
let tipoSelecionado = "house";
let temaCeu = cidade.sky || (cidade.weatherCity && cidade.weatherCity.isDay === 0 ? "night" : "day");
let temaManual = cidade.skyManual === true;
let construcaoAtual = null;
let formularioNovo = false;
let tipoArrastado = "";
let zoom = 0.86;

// Lê a cidade salva. Também aceita itens de uma versão antiga do jogo.
function carregarCidade() {
  let textoSalvo = localStorage.getItem(CHAVE_CIDADE);
  if (textoSalvo === null) return { buildings: [], weatherCity: null };

  try {
    let dados = JSON.parse(textoSalvo);
    let listaSalva = dados.buildings || dados.items || [];
    let construcoes = [];

    for (let i = 0; i < listaSalva.length; i++) {
      let item = listaSalva[i];
      if (item.row === undefined) item.row = converterPosicao(item.y, LINHAS);
      if (item.col === undefined) item.col = converterPosicao(item.x, COLUNAS);
      item.row = Number(item.row);
      item.col = Number(item.col);
      item.id = String(item.id === undefined ? Date.now() + i : item.id);

      if (buscarTipo(item.type).id !== item.type) item.type = "house";
      if (item.name === undefined) item.name = buscarTipo(item.type).nome + " " + (i + 1);
      if (item.address === undefined) item.address = "Lote " + (item.row + 1) + ", " + (item.col + 1);
      if (item.color === undefined) item.color = buscarTipo(item.type).cor;
      if (item.notes === undefined) item.notes = "";
      if (item.status === undefined) item.status = "planned";
      if (item.createdAt === undefined) item.createdAt = new Date().toISOString();

      if (item.row >= 0 && item.row < LINHAS && item.col >= 0 && item.col < COLUNAS) {
        construcoes.push(item);
      }
    }

    return { buildings: construcoes, weatherCity: dados.weatherCity || null, sky: dados.sky || null, skyManual: dados.skyManual === true };
  } catch (erro) {
    return { buildings: [], weatherCity: null };
  }
}

// Converte posições antigas para linha e coluna do mapa.
function converterPosicao(valor, tamanho) {
  let numero = Number(valor);
  if (Number.isInteger(numero) && numero >= 0 && numero < tamanho) return numero;
  if (numero >= 0 && numero <= 100) return Math.floor(numero / 100 * tamanho);
  return 0;
}

function buscarTipo(id) {
  for (let i = 0; i < tiposConstrucao.length; i++) {
    if (tiposConstrucao[i].id === id) return tiposConstrucao[i];
  }
  return tiposConstrucao[0];
}

function salvarCidade() {
  try {
    localStorage.setItem(CHAVE_CIDADE, JSON.stringify(cidade));
    document.getElementById("saveStatus").textContent = "Salvo automaticamente";
    document.getElementById("saveStatus").classList.remove("is-error");
  } catch (erro) {
    document.getElementById("saveStatus").textContent = "Não foi possível salvar";
    mostrarMensagem("O navegador não conseguiu salvar a cidade.");
  }
}

function mostrarMensagem(texto) {
  document.getElementById("message").textContent = texto;
}

function loteOcupado(linha, coluna, idIgnorado) {
  for (let i = 0; i < cidade.buildings.length; i++) {
    let item = cidade.buildings[i];
    if (item.row === linha && item.col === coluna && item.id !== idIgnorado) return true;
  }
  return false;
}

// Faz um desenho simples de construção com formas HTML e CSS, sem emoji.
function criarDesenho(tipo, cor) {
  let desenho = document.createElement("span");
  desenho.className = "building-art art-" + tipo;
  desenho.style.setProperty("--building-color", cor || buscarTipo(tipo).cor);

  let telhado = document.createElement("span");
  let corpo = document.createElement("span");
  let janela1 = document.createElement("span");
  let janela2 = document.createElement("span");
  let porta = document.createElement("span");
  let placa = document.createElement("span");

  telhado.className = "art-roof";
  corpo.className = "art-body";
  janela1.className = "art-window window-one";
  janela2.className = "art-window window-two";
  porta.className = "art-door";
  placa.className = "art-sign";
  placa.textContent = buscarTipo(tipo).abreviacao;

  desenho.append(telhado, corpo, janela1, janela2, porta, placa);
  return desenho;
}

// Monta o menu lateral com os tipos de construção.
function mostrarCatalogo() {
  catalogo.replaceChildren();

  for (let i = 0; i < tiposConstrucao.length; i++) {
    let tipo = tiposConstrucao[i];
    let botao = document.createElement("button");
    let arte = document.createElement("span");
    let texto = document.createElement("span");
    let nome = document.createElement("b");
    let descricao = document.createElement("small");
    let alca = document.createElement("span");

    botao.type = "button";
    botao.className = "piece";
    botao.dataset.type = tipo.id;
    botao.draggable = true;

    arte.className = "piece-art";
    arte.append(criarDesenho(tipo.id, tipo.cor));
    nome.textContent = tipo.nome;
    descricao.textContent = tipo.descricao;
    texto.append(nome, descricao);
    alca.className = "grip";
    alca.textContent = "⠿";
    botao.append(arte, texto, alca);
    catalogo.append(botao);
  }

  document.getElementById("pieceCount").textContent = tiposConstrucao.length + " peças";
  mostrarFiltro();
  atualizarTipoSelecionado();
}

function mostrarFiltro() {
  let filtro = document.getElementById("filterType");
  filtro.replaceChildren();

  let todos = document.createElement("option");
  todos.value = "all";
  todos.textContent = "Todos";
  filtro.append(todos);

  for (let i = 0; i < tiposConstrucao.length; i++) {
    let opcao = document.createElement("option");
    opcao.value = tiposConstrucao[i].id;
    opcao.textContent = tiposConstrucao[i].nome;
    filtro.append(opcao);
  }
}

function atualizarTipoSelecionado() {
  let botoes = catalogo.querySelectorAll(".piece");
  for (let i = 0; i < botoes.length; i++) {
    let selecionado = botoes[i].dataset.type === tipoSelecionado;
    botoes[i].classList.toggle("selected", selecionado);
    botoes[i].setAttribute("aria-pressed", String(selecionado));
  }

  let aviso = document.getElementById("hint");
  if (document.getElementById("removeMode").getAttribute("aria-pressed") === "true") {
    aviso.textContent = "Abra uma construção e escolha Excluir nos detalhes.";
  } else {
    aviso.textContent = "Peça selecionada: " + buscarTipo(tipoSelecionado).nome + ". Toque em um lote ou arraste até ele.";
  }
}

function mostrarLotes() {
  mapaDeLotes.replaceChildren();

  for (let linha = 0; linha < LINHAS; linha++) {
    for (let coluna = 0; coluna < COLUNAS; coluna++) {
      let lote = document.createElement("button");
      let ocupado = loteOcupado(linha, coluna, "");

      lote.type = "button";
      lote.className = "tile";
      lote.dataset.row = linha;
      lote.dataset.col = coluna;
      lote.setAttribute("role", "gridcell");
      lote.setAttribute("aria-label", "Lote " + (linha + 1) + ", " + (coluna + 1));
      lote.classList.toggle("occupied", ocupado);
      mapaDeLotes.append(lote);
    }
  }
}

function obterConstrucoesVisiveis() {
  let resultado = [];
  let busca = document.getElementById("searchBuildings").value.trim().toLowerCase();
  let filtro = document.getElementById("filterType").value;

  for (let i = 0; i < cidade.buildings.length; i++) {
    let item = cidade.buildings[i];
    let tipo = buscarTipo(item.type);
    let texto = (item.name + " " + item.address + " " + item.notes + " " + tipo.nome).toLowerCase();

    if ((filtro === "all" || filtro === item.type) && (busca === "" || texto.includes(busca))) {
      resultado.push(item);
    }
  }

  let ordem = document.getElementById("sortBy").value;
  resultado.sort(function (a, b) {
    if (ordem === "name") return a.name.localeCompare(b.name, "pt-BR");
    if (ordem === "type") return buscarTipo(a.type).nome.localeCompare(buscarTipo(b.type).nome, "pt-BR");
    if (ordem === "oldest") return a.createdAt.localeCompare(b.createdAt);
    return b.createdAt.localeCompare(a.createdAt);
  });
  return resultado;
}

// Atualiza a lista e os desenhos da cidade.
function mostrarConstrucoes() {
  let visiveis = obterConstrucoesVisiveis();
  listaDeConstrucoes.replaceChildren();
  mapaDeConstrucoes.replaceChildren();

  for (let i = 0; i < visiveis.length; i++) {
    let item = visiveis[i];
    let tipo = buscarTipo(item.type);

    let linha = document.createElement("li");
    let botaoLista = document.createElement("button");
    let marcador = document.createElement("span");
    let informacoes = document.createElement("span");
    let nome = document.createElement("b");
    let endereco = document.createElement("small");

    botaoLista.type = "button";
    botaoLista.className = "building-row";
    botaoLista.dataset.id = item.id;
    marcador.className = "type-marker";
    marcador.textContent = tipo.abreviacao;
    informacoes.className = "building-row-info";
    nome.textContent = item.name;
    endereco.textContent = tipo.nome + " · " + item.address;
    informacoes.append(nome, endereco);
    botaoLista.append(marcador, informacoes);
    linha.append(botaoLista);
    listaDeConstrucoes.append(linha);

    let desenho = document.createElement("button");
    desenho.type = "button";
    desenho.className = "placed";
    desenho.dataset.id = item.id;
    desenho.draggable = true;
    desenho.style.left = ((item.col + 0.5) / COLUNAS * 100) + "%";
    desenho.style.top = ((item.row + 0.5) / LINHAS * 100) + "%";
    desenho.setAttribute("aria-label", item.name + ", " + tipo.nome + ". Toque para entrar.");
    desenho.append(criarDesenho(item.type, item.color));

    let etiqueta = document.createElement("span");
    etiqueta.className = "placed-label";
    etiqueta.textContent = item.name;
    desenho.append(etiqueta);
    mapaDeConstrucoes.append(desenho);
  }

  let total = cidade.buildings.length;
  document.getElementById("count").textContent = total + (total === 1 ? " item" : " itens");
  document.getElementById("mapCount").textContent = total;
  document.getElementById("emptyList").hidden = visiveis.length > 0;
  mostrarLotes();
}

// Abre o formulário antes de guardar uma construção nova.
function prepararConstrucao(tipo, linha, coluna) {
  if (loteOcupado(linha, coluna, "")) {
    mostrarMensagem("Esse lote já está ocupado. Escolha um lote livre.");
    return;
  }

  let tipoInfo = buscarTipo(tipo);
  construcaoAtual = {
    id: String(Date.now()) + String(Math.floor(Math.random() * 1000)),
    type: tipo,
    row: linha,
    col: coluna,
    name: tipoInfo.nome,
    address: "Rua " + (linha + 1) + ", lote " + (coluna + 1),
    color: tipoInfo.cor,
    status: "planned",
    notes: "",
    createdAt: new Date().toISOString()
  };
  formularioNovo = true;
  mostrarFormulario();
}

function mostrarFormulario() {
  document.getElementById("insideView").hidden = true;
  formulario.hidden = false;

  let tipo = buscarTipo(construcaoAtual.type);
  document.getElementById("formKicker").textContent =
    formularioNovo ? "NOVA " + tipo.nome.toUpperCase() : "EDITAR CONSTRUÇÃO";
  document.getElementById("formTitle").textContent =
    formularioNovo ? "Personalize sua construção" : "Editar informações";
  document.getElementById("formLocation").textContent =
    "Lote " + (construcaoAtual.row + 1) + ", " + (construcaoAtual.col + 1);

  document.getElementById("buildingName").value = formularioNovo ? "" : construcaoAtual.name;
  document.getElementById("buildingName").placeholder = tipo.nome + " da família";
  document.getElementById("buildingAddress").value = construcaoAtual.address;
  document.getElementById("buildingColor").value = construcaoAtual.color || tipo.cor;
  document.getElementById("buildingStatus").value = construcaoAtual.status;
  document.getElementById("buildingNotes").value = construcaoAtual.notes || "";
  document.getElementById("buildingName").focus();

  if (!janela.open) janela.showModal();
}

function cancelarFormulario() {
  if (formularioNovo) {
    janela.close();
    construcaoAtual = null;
  } else if (construcaoAtual !== null) {
    entrarNaConstrucao(construcaoAtual.id);
  }
}

// Salva os dados digitados e coloca a nova construção no mapa.
function salvarFormulario(evento) {
  evento.preventDefault();
  let nome = document.getElementById("buildingName").value.trim();
  let endereco = document.getElementById("buildingAddress").value.trim();

  if (nome === "" || endereco === "") {
    mostrarMensagem("Preencha o nome e o endereço.");
    return;
  }

  construcaoAtual.name = nome;
  construcaoAtual.address = endereco;
  construcaoAtual.color = document.getElementById("buildingColor").value;
  construcaoAtual.status = document.getElementById("buildingStatus").value;
  construcaoAtual.notes = document.getElementById("buildingNotes").value.trim();

  if (formularioNovo) {
    cidade.buildings.push(construcaoAtual);
    mostrarMensagem(nome + " foi adicionada à cidade.");
  } else {
    mostrarMensagem(nome + " foi atualizada.");
  }

  salvarCidade();
  mostrarConstrucoes();
  janela.close();
  formularioNovo = false;
  construcaoAtual = null;
}

function entrarNaConstrucao(id) {
  for (let i = 0; i < cidade.buildings.length; i++) {
    if (cidade.buildings[i].id === id) {
      construcaoAtual = cidade.buildings[i];
      let tipo = buscarTipo(construcaoAtual.type);

      formulario.hidden = true;
      document.getElementById("insideView").hidden = false;
      document.getElementById("dialogTitle").textContent = construcaoAtual.name;
      document.getElementById("insideMessage").textContent =
        "Você entrou em " + construcaoAtual.name + ".";
      document.getElementById("insideAddress").textContent = construcaoAtual.address;
      document.getElementById("insideStatus").textContent =
        document.querySelector('#buildingStatus option[value="' + construcaoAtual.status + '"]').textContent;
      document.getElementById("insideNotes").textContent =
        construcaoAtual.notes || "Nenhuma informação adicional.";
      document.getElementById("interiorDrawing").replaceChildren(
        criarDesenho(construcaoAtual.type, construcaoAtual.color)
      );
      document.getElementById("interiorDrawing").style.setProperty(
        "--building-color",
        construcaoAtual.color || tipo.cor
      );

      if (!janela.open) janela.showModal();
      return;
    }
  }
}

function excluirConstrucao() {
  if (construcaoAtual === null) return;

  for (let i = 0; i < cidade.buildings.length; i++) {
    if (cidade.buildings[i].id === construcaoAtual.id) {
      let nome = cidade.buildings[i].name;
      cidade.buildings.splice(i, 1);
      salvarCidade();
      mostrarConstrucoes();
      janela.close();
      construcaoAtual = null;
      mostrarMensagem(nome + " foi removida da cidade.");
      return;
    }
  }
}

function selecionarTipo(tipo) {
  tipoSelecionado = tipo;
  document.getElementById("removeMode").setAttribute("aria-pressed", "false");
  atualizarTipoSelecionado();
  fecharMenu();
  mostrarMensagem(buscarTipo(tipo).nome + " selecionada. Escolha um lote.");
}

function configurarZoom(novoZoom) {
  if (novoZoom < 0.65) novoZoom = 0.65;
  if (novoZoom > 1.12) novoZoom = 1.12;
  zoom = novoZoom;
  document.documentElement.style.setProperty("--map-zoom", zoom);
  document.getElementById("zoomLabel").textContent = Math.round(zoom * 100) + "%";
}

function abrirMenu() {
  document.getElementById("sidebar").classList.add("open");
  document.getElementById("overlay").classList.add("show");
}

function fecharMenu() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("overlay").classList.remove("show");
}

function aplicarTema() {
  let viewport = document.getElementById("viewport");
  let botao = document.getElementById("toggleSky");
  viewport.classList.toggle("night", temaCeu === "night");
  botao.textContent = temaCeu === "day" ? "Céu: Dia" : "Céu: Noite";
  botao.setAttribute("aria-pressed", String(temaCeu === "night"));
  document.getElementById("autoSky").setAttribute("aria-pressed", String(!temaManual));
}

function aplicarClimaNoMapa() {
  let viewport = document.getElementById("viewport");
  let clima = cidade.weatherCity;
  let codigo = clima ? Number(clima.weatherCode) : -1;
  let chuva = clima ? Number(clima.precipitation) : 0;
  let coberturaNuvens = clima ? Number(clima.cloudCover) : 0;

  let nublado = coberturaNuvens >= 55 || [1, 2, 3, 45, 48].includes(codigo) ||
    (codigo >= 51 && codigo <= 67) ||
    (codigo >= 80 && codigo <= 82) ||
    (codigo >= 95 && codigo <= 99);
  let chovendo = chuva >= 0.1 ||
    (codigo >= 51 && codigo <= 67) ||
    (codigo >= 80 && codigo <= 82) ||
    (codigo >= 95 && codigo <= 99);

  viewport.classList.toggle("weather-cloudy", nublado);
  viewport.classList.toggle("weather-rain", chovendo);
}

function alternarTema() {
  temaCeu = temaCeu === "day" ? "night" : "day";
  temaManual = true;
  cidade.skyManual = true;
  cidade.sky = temaCeu;
  salvarCidade();
  aplicarTema();
}

function usarCeuAutomatico() {
  temaManual = false;
  cidade.skyManual = false;
  temaCeu = cidade.weatherCity && Number(cidade.weatherCity.isDay) === 0 ? "night" : "day";
  cidade.sky = temaCeu;
  salvarCidade();
  aplicarTema();
}

// Consulta cidade e previsão atual pela API pública Open-Meteo.
async function consultarClima(evento) {
  evento.preventDefault();

  let campoCidade = document.getElementById("cityInput");
  let resultado = document.getElementById("weatherResult");
  let botao = document.getElementById("weatherButton");
  botao.disabled = true;
  resultado.textContent = "Consultando o clima...";

  try {
    let buscaUrl = "https://geocoding-api.open-meteo.com/v1/search?name=" +
      encodeURIComponent(campoCidade.value.trim()) + "&count=1&language=pt&countryCode=BR&format=json";
    let respostaBusca = await fetch(buscaUrl);
    let dadosBusca = await respostaBusca.json();

    if (!dadosBusca.results || dadosBusca.results.length === 0) {
      resultado.textContent = "Não encontrei essa cidade.";
      botao.disabled = false;
      return;
    }

    let local = dadosBusca.results[0];
    let climaUrl = "https://api.open-meteo.com/v1/forecast?latitude=" +
      local.latitude + "&longitude=" + local.longitude +
      "&current=temperature_2m,precipitation,weather_code,wind_speed_10m,is_day,cloud_cover&timezone=auto";
    let respostaClima = await fetch(climaUrl);
    let dadosClima = await respostaClima.json();

    cidade.weatherCity = {
      name: local.name + ", " + (local.admin1 || "") + ", " + local.country,
      temperature: dadosClima.current.temperature_2m,
      precipitation: dadosClima.current.precipitation,
      windSpeed: dadosClima.current.wind_speed_10m,
      isDay: dadosClima.current.is_day,
      weatherCode: dadosClima.current.weather_code,
      cloudCover: dadosClima.current.cloud_cover
    };
    aplicarClimaNoMapa();
    if (!temaManual) {
      temaCeu = dadosClima.current.is_day === 1 ? "day" : "night";
      cidade.sky = temaCeu;
      aplicarTema();
    }
    salvarCidade();
    mostrarClima();
    mostrarMensagem("Clima atualizado para " + local.name + ".");
  } catch (erro) {
    resultado.textContent = "Não consegui consultar. Confira sua conexão e tente novamente.";
  }

  botao.disabled = false;
}

function mostrarClima() {
  if (cidade.weatherCity === null) return;

  let clima = cidade.weatherCity;
  let temperatura = Number(clima.temperature);
  let chuva = Number(clima.precipitation);
  let vento = Number(clima.windSpeed);

  document.getElementById("cityInput").value = clima.name.split(",")[0];
  document.getElementById("weatherResult").textContent =
    clima.name + ": " + temperatura + " °C · chuva " + chuva + " mm · nuvens " + Number(clima.cloudCover || 0) + "% · vento " + vento + " km/h";

  if (vento >= 30) {
    document.getElementById("weatherAdvice").textContent =
      "Ventos fortes: mantenha ruas acessíveis e priorize os serviços de emergência.";
  } else if (chuva >= 1) {
    document.getElementById("weatherAdvice").textContent =
      "Chuva: planeje ruas e mantenha hospital e bombeiros conectados.";
  } else if (temperatura >= 28) {
    document.getElementById("weatherAdvice").textContent =
      "Calor ou tempo seco: priorize árvores e parques para criar sombra.";
  } else {
    document.getElementById("weatherAdvice").textContent =
      "Clima ameno: equilibre moradias, serviços e áreas verdes.";
  }
}

// Eventos do menu, mapa e formulário
catalogo.addEventListener("click", function (evento) {
  let botao = evento.target.closest(".piece");
  if (botao) selecionarTipo(botao.dataset.type);
});

catalogo.addEventListener("dragstart", function (evento) {
  let botao = evento.target.closest(".piece");
  if (botao) evento.dataTransfer.setData("text/plain", botao.dataset.type);
});

mapaDeLotes.addEventListener("click", function (evento) {
  let lote = evento.target.closest(".tile");
  if (lote === null) return;

  if (document.getElementById("removeMode").getAttribute("aria-pressed") === "true") {
    mostrarMensagem("Toque em uma construção para entrar e depois escolha Excluir.");
  } else {
    prepararConstrucao(
      tipoSelecionado,
      Number(lote.dataset.row),
      Number(lote.dataset.col)
    );
  }
});

mapaDeLotes.addEventListener("dragover", function (evento) {
  if (evento.target.closest(".tile")) evento.preventDefault();
});

mapaDeLotes.addEventListener("drop", function (evento) {
  let lote = evento.target.closest(".tile");
  if (lote === null) return;
  evento.preventDefault();

  let id = evento.dataTransfer.getData("application/x-dragcit-building");
  let tipo = evento.dataTransfer.getData("text/plain");
  let linha = Number(lote.dataset.row);
  let coluna = Number(lote.dataset.col);

  if (id !== "") {
    for (let i = 0; i < cidade.buildings.length; i++) {
      if (cidade.buildings[i].id === id && !loteOcupado(linha, coluna, id)) {
        cidade.buildings[i].row = linha;
        cidade.buildings[i].col = coluna;
        salvarCidade();
        mostrarConstrucoes();
        return;
      }
    }
    mostrarMensagem("Esse lote já está ocupado.");
  } else if (tipo !== "") {
    prepararConstrucao(tipo, linha, coluna);
  }
});

mapaDeConstrucoes.addEventListener("click", function (evento) {
  let construcao = evento.target.closest(".placed");
  if (construcao) entrarNaConstrucao(construcao.dataset.id);
});

mapaDeConstrucoes.addEventListener("dragstart", function (evento) {
  let construcao = evento.target.closest(".placed");
  if (construcao) {
    evento.dataTransfer.setData("application/x-dragcit-building", construcao.dataset.id);
  }
});

listaDeConstrucoes.addEventListener("click", function (evento) {
  let botao = evento.target.closest(".building-row");
  if (botao) entrarNaConstrucao(botao.dataset.id);
});

document.getElementById("searchBuildings").addEventListener("input", mostrarConstrucoes);
document.getElementById("filterType").addEventListener("change", mostrarConstrucoes);
document.getElementById("sortBy").addEventListener("change", mostrarConstrucoes);
formulario.addEventListener("submit", salvarFormulario);

document.getElementById("editBuilding").addEventListener("click", function () {
  if (construcaoAtual !== null) {
    formularioNovo = false;
    mostrarFormulario();
  }
});

document.getElementById("deleteBuilding").addEventListener("click", excluirConstrucao);
document.getElementById("cancelForm").addEventListener("click", cancelarFormulario);
document.getElementById("cancelFormButton").addEventListener("click", cancelarFormulario);
document.getElementById("closeDialog").addEventListener("click", function () {
  janela.close();
  construcaoAtual = null;
});

janela.addEventListener("click", function (evento) {
  if (evento.target === janela) {
    janela.close();
    construcaoAtual = null;
  }
});

document.getElementById("removeMode").addEventListener("click", function () {
  let botao = document.getElementById("removeMode");
  let ativo = botao.getAttribute("aria-pressed") === "true";
  botao.setAttribute("aria-pressed", String(!ativo));
  botao.classList.toggle("active", !ativo);
  atualizarTipoSelecionado();
});

document.getElementById("save").addEventListener("click", salvarCidade);
document.getElementById("toggleSky").addEventListener("click", alternarTema);
document.getElementById("autoSky").addEventListener("click", usarCeuAutomatico);
document.getElementById("clear").addEventListener("click", function () {
  if (cidade.buildings.length === 0) {
    mostrarMensagem("A cidade já está vazia.");
  } else if (confirm("Limpar todas as construções da cidade?")) {
    cidade.buildings = [];
    salvarCidade();
    mostrarConstrucoes();
    mostrarMensagem("Cidade limpa.");
  }
});

document.getElementById("openMenu").addEventListener("click", abrirMenu);
document.getElementById("closeMenu").addEventListener("click", fecharMenu);
document.getElementById("overlay").addEventListener("click", fecharMenu);
document.getElementById("zoomIn").addEventListener("click", function () {
  configurarZoom(zoom + 0.08);
});
document.getElementById("zoomOut").addEventListener("click", function () {
  configurarZoom(zoom - 0.08);
});
document.getElementById("resetZoom").addEventListener("click", function () {
  configurarZoom(0.86);
});
document.getElementById("weatherForm").addEventListener("submit", consultarClima);

// Mostra o que estava salvo quando o jogo abre.
mostrarCatalogo();
mostrarConstrucoes();
configurarZoom(zoom);
aplicarTema();
aplicarClimaNoMapa();
mostrarClima();