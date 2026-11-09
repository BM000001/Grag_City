(() => {
  // Dados principais do jogo
  const LINHAS = 8;
  const COLUNAS = 12;
  const CHAVE_CIDADE = "dragCitCityV1";

  // Cada tipo tem um nome, um ícone e uma cor definida no CSS.
  const tiposConstrucao = [
    { id: "house", nome: "Casa", descricao: "Moradia", icone: "⌂", cor: "house" },
    { id: "apartment", nome: "Prédio", descricao: "Moradia coletiva", icone: "▥", cor: "apartment" },
    { id: "hospital", nome: "Hospital", descricao: "Saúde e atendimento", icone: "✚", cor: "hospital" },
    { id: "shop", nome: "Loja", descricao: "Comércio local", icone: "▤", cor: "shop" },
    { id: "school", nome: "Escola", descricao: "Educação", icone: "⌑", cor: "school" },
    { id: "park", nome: "Parque", descricao: "Lazer e natureza", icone: "✿", cor: "park" },
    { id: "tree", nome: "Árvore", descricao: "Área verde", icone: "♣", cor: "tree" },
    { id: "police", nome: "Delegacia", descricao: "Segurança pública", icone: "✦", cor: "police" },
    { id: "fire", nome: "Bombeiros", descricao: "Emergência e resgate", icone: "✹", cor: "fire" },
    { id: "road", nome: "Rua", descricao: "Mobilidade urbana", icone: "━", cor: "road" }
  ];

  // Elementos da página usados pelo JavaScript
  const catalogo = document.getElementById("catalog");
  const mapaDeLotes = document.getElementById("tiles");
  const mapaDeConstrucoes = document.getElementById("buildings");
  const listaDeConstrucoes = document.getElementById("buildingList");
  const mensagem = document.getElementById("message");
  const busca = document.getElementById("searchBuildings");
  const filtro = document.getElementById("filterType");
  const ordenacao = document.getElementById("sortBy");
  const janelaDetalhes = document.getElementById("buildingDialog");
  const formularioDetalhes = document.getElementById("buildingForm");
  const campoNome = document.getElementById("buildingName");
  const campoStatus = document.getElementById("buildingStatus");
  const campoObservacoes = document.getElementById("buildingNotes");

  // Estado atual da cidade
  let cidade = carregarCidade();
  let tipoSelecionado = "house";
  let idSelecionado = "";
  let modoRemover = false;
  let tipoArrastado = "";
  let construcaoArrastada = "";
  let zoom = 0.86;

  // Procura os dados salvos para continuar a cidade depois de fechar a página.
  function carregarCidade() {
    let dadosSalvos = localStorage.getItem(CHAVE_CIDADE);

    if (dadosSalvos === null) {
      return { buildings: [], weatherCity: null };
    }

    try {
      let dados = JSON.parse(dadosSalvos);
      let listaSalva = dados.buildings || dados.items || [];
      let construcoes = [];

      // Também lê algumas versões antigas que guardavam x e y no lugar de linha e coluna.
      for (let i = 0; i < listaSalva.length; i++) {
        let item = listaSalva[i];

        if (item.row === undefined) {
          item.row = converterPosicao(item.y, LINHAS);
        }
        if (item.col === undefined) {
          item.col = converterPosicao(item.x, COLUNAS);
        }

        if (item.id === undefined) {
          item.id = String(Date.now() + i);
        }
        if (item.name === undefined) {
          item.name = procurarTipo(item.type).nome + " " + (i + 1);
        }
        if (item.notes === undefined) {
          item.notes = "";
        }
        if (item.status === undefined) {
          item.status = "planned";
        }
        if (item.createdAt === undefined) {
          item.createdAt = new Date().toISOString();
        }

        if (item.row >= 0 && item.row < LINHAS && item.col >= 0 && item.col < COLUNAS) {
          construcoes.push(item);
        }
      }

      return {
        buildings: construcoes,
        weatherCity: dados.weatherCity || null
      };
    } catch (erro) {
      return { buildings: [], weatherCity: null };
    }
  }

  // Converte uma posição antiga do mapa para uma casa da grade.
  function converterPosicao(valor, tamanho) {
    let numero = Number(valor);

    if (Number.isInteger(numero) && numero >= 0 && numero < tamanho) {
      return numero;
    }

    if (numero >= 0 && numero <= 100) {
      return Math.floor(numero / 100 * tamanho);
    }

    return 0;
  }

  function procurarTipo(id) {
    for (let i = 0; i < tiposConstrucao.length; i++) {
      if (tiposConstrucao[i].id === id) {
        return tiposConstrucao[i];
      }
    }

    return tiposConstrucao[0];
  }

  function salvarCidade() {
    try {
      localStorage.setItem(CHAVE_CIDADE, JSON.stringify(cidade));
      document.getElementById("saveStatus").textContent = "Salvo automaticamente";
      document.getElementById("saveStatus").classList.remove("is-error");
      return true;
    } catch (erro) {
      document.getElementById("saveStatus").textContent = "Não foi possível salvar";
      document.getElementById("saveStatus").classList.add("is-error");
      mostrarMensagem("O navegador não conseguiu salvar a cidade.");
      return false;
    }
  }

  function mostrarMensagem(texto) {
    mensagem.textContent = texto;
  }

  function loteOcupado(linha, coluna, idIgnorado) {
    for (let i = 0; i < cidade.buildings.length; i++) {
      let construcao = cidade.buildings[i];

      if (construcao.row === linha && construcao.col === coluna && construcao.id !== idIgnorado) {
        return true;
      }
    }

    return false;
  }

  // Cria os botões das construções no menu lateral.
  function mostrarCatalogo() {
    catalogo.replaceChildren();

    for (let i = 0; i < tiposConstrucao.length; i++) {
      let tipo = tiposConstrucao[i];
      let botao = document.createElement("button");
      let icone = document.createElement("span");
      let textos = document.createElement("span");
      let nome = document.createElement("b");
      let descricao = document.createElement("small");
      let alca = document.createElement("span");

      botao.type = "button";
      botao.className = "piece";
      botao.dataset.type = tipo.id;
      botao.draggable = true;
      botao.setAttribute("aria-pressed", "false");

      icone.className = "art " + tipo.cor;
      icone.textContent = tipo.icone;
      nome.textContent = tipo.nome;
      descricao.textContent = tipo.descricao;
      textos.append(nome, descricao);

      alca.className = "grip";
      alca.setAttribute("aria-hidden", "true");
      alca.textContent = "⠿";

      botao.append(icone, textos, alca);
      catalogo.append(botao);
    }

    document.getElementById("pieceCount").textContent = tiposConstrucao.length + " peças";
    mostrarOpcoesDeFiltro();
    atualizarTipoSelecionado();
  }

  function mostrarOpcoesDeFiltro() {
    filtro.replaceChildren();

    let opcaoTodos = document.createElement("option");
    opcaoTodos.value = "all";
    opcaoTodos.textContent = "Todos";
    filtro.append(opcaoTodos);

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

    if (modoRemover) {
      document.getElementById("hint").textContent = "Abra uma construção e escolha Excluir nos detalhes";
    } else {
      document.getElementById("hint").textContent =
        "Peça selecionada: " + procurarTipo(tipoSelecionado).nome + ". Toque em um lote ou arraste até ele.";
    }
  }

  // Desenha os 96 lotes do mapa.
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
        lote.setAttribute(
          "aria-label",
          "Lote " + (linha + 1) + ", " + (coluna + 1) + (ocupado ? ", ocupado" : ", livre")
        );
        lote.classList.toggle("occupied", ocupado);
        mapaDeLotes.append(lote);
      }
    }
  }

  function obterConstrucoesVisiveis() {
    let resultado = [];
    let textoBusca = busca.value.trim().toLowerCase();

    for (let i = 0; i < cidade.buildings.length; i++) {
      let item = cidade.buildings[i];
      let tipo = procurarTipo(item.type);
      let textoItem = (item.name + " " + item.notes + " " + tipo.nome).toLowerCase();
      let passouNoFiltro = filtro.value === "all" || item.type === filtro.value;
      let passouNaBusca = textoBusca === "" || textoItem.includes(textoBusca);

      if (passouNoFiltro && passouNaBusca) {
        resultado.push(item);
      }
    }

    if (ordenacao.value === "name") {
      resultado.sort(function (a, b) {
        return a.name.localeCompare(b.name, "pt-BR");
      });
    } else if (ordenacao.value === "type") {
      resultado.sort(function (a, b) {
        return procurarTipo(a.type).nome.localeCompare(procurarTipo(b.type).nome, "pt-BR");
      });
    } else if (ordenacao.value === "oldest") {
      resultado.sort(function (a, b) {
        return a.createdAt.localeCompare(b.createdAt);
      });
    } else {
      resultado.sort(function (a, b) {
        return b.createdAt.localeCompare(a.createdAt);
      });
    }

    return resultado;
  }

  // Atualiza a lista lateral e as construções que aparecem no mapa.
  function mostrarConstrucoes() {
    let construcoesVisiveis = obterConstrucoesVisiveis();
    listaDeConstrucoes.replaceChildren();
    mapaDeConstrucoes.replaceChildren();

    for (let i = 0; i < construcoesVisiveis.length; i++) {
      let item = construcoesVisiveis[i];
      let tipo = procurarTipo(item.type);

      let linha = document.createElement("li");
      let botaoLista = document.createElement("button");
      let iconeLista = document.createElement("span");
      let informacoes = document.createElement("span");
      let nome = document.createElement("b");
      let local = document.createElement("small");
      let status = document.createElement("span");

      botaoLista.type = "button";
      botaoLista.className = "building-row";
      botaoLista.dataset.id = item.id;
      botaoLista.setAttribute(
        "aria-label",
        item.name + ", " + tipo.nome + ". Abrir detalhes."
      );

      iconeLista.className = "art mini " + tipo.cor;
      iconeLista.textContent = tipo.icone;
      informacoes.className = "building-row-info";
      nome.textContent = item.name;
      local.textContent = tipo.nome + " · Lote " + (item.row + 1) + ", " + (item.col + 1);
      informacoes.append(nome, local);

      status.className = "status-dot status-" + item.status;
      botaoLista.append(iconeLista, informacoes, status);
      linha.append(botaoLista);
      listaDeConstrucoes.append(linha);

      let construcao = document.createElement("button");
      let iconeMapa = document.createElement("span");
      let nomeMapa = document.createElement("span");

      construcao.type = "button";
      construcao.className = "placed placed-" + tipo.cor;
      construcao.dataset.id = item.id;
      construcao.draggable = true;
      construcao.style.left = ((item.col + 0.5) / COLUNAS * 100) + "%";
      construcao.style.top = ((item.row + 0.5) / LINHAS * 100) + "%";
      construcao.setAttribute("aria-label", item.name + ", toque para ver detalhes ou arraste para mover.");

      iconeMapa.className = "placed-icon";
      iconeMapa.textContent = tipo.icone;
      nomeMapa.className = "placed-label";
      nomeMapa.textContent = item.name;
      construcao.append(iconeMapa, nomeMapa);
      mapaDeConstrucoes.append(construcao);
    }

    let total = cidade.buildings.length;
    document.getElementById("count").textContent = total + (total === 1 ? " item" : " itens");
    document.getElementById("mapCount").textContent = total;
    document.getElementById("emptyList").hidden = construcoesVisiveis.length > 0;

    mostrarLotes();
  }

  function selecionarTipo(id) {
    tipoSelecionado = id;
    modoRemover = false;
    document.getElementById("removeMode").setAttribute("aria-pressed", "false");
    document.getElementById("removeMode").classList.remove("active");
    atualizarTipoSelecionado();
    mostrarMensagem(procurarTipo(id).nome + " selecionada. Escolha um lote livre.");
    fecharMenu();
  }

  function colocarConstrucao(tipo, linha, coluna) {
    if (loteOcupado(linha, coluna, "")) {
      mostrarMensagem("Esse lote já está ocupado. Escolha um espaço livre.");
      return;
    }

    let quantidade = 0;
    for (let i = 0; i < cidade.buildings.length; i++) {
      if (cidade.buildings[i].type === tipo) {
        quantidade++;
      }
    }

    let novaConstrucao = {
      id: String(Date.now()) + String(Math.floor(Math.random() * 1000)),
      type: tipo,
      row: linha,
      col: coluna,
      name: procurarTipo(tipo).nome + " " + (quantidade + 1),
      notes: "",
      status: "planned",
      createdAt: new Date().toISOString()
    };

    cidade.buildings.push(novaConstrucao);
    salvarCidade();
    mostrarConstrucoes();
    mostrarMensagem(novaConstrucao.name + " adicionada. Toque nela para editar os detalhes.");
  }

  function moverConstrucao(id, linha, coluna) {
    for (let i = 0; i < cidade.buildings.length; i++) {
      let item = cidade.buildings[i];

      if (item.id === id) {
        if (loteOcupado(linha, coluna, id)) {
          mostrarMensagem("Esse lote já está ocupado. A construção não foi movida.");
          return;
        }

        item.row = linha;
        item.col = coluna;
        item.updatedAt = new Date().toISOString();
        salvarCidade();
        mostrarConstrucoes();
        mostrarMensagem(item.name + " movida para outro lote.");
        return;
      }
    }
  }

  function abrirDetalhes(id) {
    for (let i = 0; i < cidade.buildings.length; i++) {
      let item = cidade.buildings[i];

      if (item.id === id) {
        idSelecionado = id;
        let tipo = procurarTipo(item.type);

        document.getElementById("dialogTitle").textContent = tipo.icone + " " + item.name;
        document.getElementById("dialogLocation").textContent =
          tipo.nome + " · Lote " + (item.row + 1) + ", " + (item.col + 1);
        campoNome.value = item.name;
        campoStatus.value = item.status;
        campoObservacoes.value = item.notes;
        janelaDetalhes.showModal();
        return;
      }
    }
  }

  function fecharDetalhes() {
    janelaDetalhes.close();
    idSelecionado = "";
  }

  function excluirConstrucao() {
    for (let i = 0; i < cidade.buildings.length; i++) {
      if (cidade.buildings[i].id === idSelecionado) {
        let nome = cidade.buildings[i].name;
        cidade.buildings.splice(i, 1);
        salvarCidade();
        mostrarConstrucoes();
        fecharDetalhes();
        mostrarMensagem(nome + " foi removida da cidade.");
        return;
      }
    }
  }

  function salvarEdicao(evento) {
    evento.preventDefault();

    for (let i = 0; i < cidade.buildings.length; i++) {
      let item = cidade.buildings[i];

      if (item.id === idSelecionado) {
        let novoNome = campoNome.value.trim();

        if (novoNome === "") {
          campoNome.setCustomValidity("Informe um nome.");
          campoNome.reportValidity();
          return;
        }

        campoNome.setCustomValidity("");
        item.name = novoNome;
        item.status = campoStatus.value;
        item.notes = campoObservacoes.value.trim();
        item.updatedAt = new Date().toISOString();
        salvarCidade();
        mostrarConstrucoes();
        fecharDetalhes();
        mostrarMensagem(novoNome + " atualizado.");
        return;
      }
    }
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

  // Consulta uma cidade e depois busca o clima atual daquela localização.
  async function consultarClima(evento) {
    evento.preventDefault();

    let nomeCidade = document.getElementById("cityInput").value.trim();
    let resultadoClima = document.getElementById("weatherResult");
    let botaoClima = document.getElementById("weatherButton");

    if (nomeCidade.length < 2) {
      resultadoClima.textContent = "Digite o nome de uma cidade.";
      return;
    }

    botaoClima.disabled = true;
    resultadoClima.textContent = "Consultando o clima...";

    try {
      let enderecoBusca = "https://geocoding-api.open-meteo.com/v1/search?name=" +
        encodeURIComponent(nomeCidade) + "&count=1&language=pt&countryCode=BR&format=json";
      let respostaCidade = await fetch(enderecoBusca);
      let dadosCidade = await respostaCidade.json();

      if (!dadosCidade.results || dadosCidade.results.length === 0) {
        resultadoClima.textContent = "Não encontrei essa cidade. Confira o nome.";
        botaoClima.disabled = false;
        return;
      }

      let local = dadosCidade.results[0];
      let enderecoClima = "https://api.open-meteo.com/v1/forecast?latitude=" +
        local.latitude + "&longitude=" + local.longitude +
        "&current=temperature_2m,precipitation,weather_code,wind_speed_10m&timezone=auto";
      let respostaClima = await fetch(enderecoClima);
      let dadosClima = await respostaClima.json();
      let climaAtual = dadosClima.current;

      cidade.weatherCity = {
        name: local.name + ", " + (local.admin1 || "") + ", " + local.country,
        temperature: climaAtual.temperature_2m,
        precipitation: climaAtual.precipitation,
        windSpeed: climaAtual.wind_speed_10m,
        checkedAt: new Date().toISOString()
      };

      salvarCidade();
      mostrarClima();
      mostrarMensagem("Clima atualizado para " + local.name + ".");
    } catch (erro) {
      resultadoClima.textContent = "Não consegui consultar. Confira sua conexão e tente novamente.";
    }

    botaoClima.disabled = false;
  }

  function mostrarClima() {
    if (cidade.weatherCity === null) return;

    let clima = cidade.weatherCity;
    let temperatura = Number(clima.temperature);
    let chuva = Number(clima.precipitation);
    let vento = Number(clima.windSpeed);

    document.getElementById("cityInput").value = clima.name.split(",")[0];
    document.getElementById("weatherResult").textContent =
      clima.name + ": " + temperatura + " °C · chuva " + chuva + " mm · vento " + vento + " km/h";

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

  // Clique na construção do menu seleciona a peça.
  catalogo.addEventListener("click", function (evento) {
    let botao = evento.target.closest(".piece");
    if (botao) selecionarTipo(botao.dataset.type);
  });

  // Arrastar uma peça do menu para o mapa.
  catalogo.addEventListener("dragstart", function (evento) {
    let botao = evento.target.closest(".piece");
    if (botao === null) return;
    tipoArrastado = botao.dataset.type;
    evento.dataTransfer.setData("text/plain", tipoArrastado);
  });

  mapaDeLotes.addEventListener("click", function (evento) {
    let lote = evento.target.closest(".tile");
    if (lote === null) return;

    if (modoRemover) {
      mostrarMensagem("Abra uma construção e escolha Excluir nos detalhes.");
    } else {
      colocarConstrucao(tipoSelecionado, Number(lote.dataset.row), Number(lote.dataset.col));
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
    let linha = Number(lote.dataset.row);
    let coluna = Number(lote.dataset.col);

    if (id !== "") {
      moverConstrucao(id, linha, coluna);
    } else if (tipoArrastado !== "") {
      colocarConstrucao(tipoArrastado, linha, coluna);
    }
  });

  mapaDeConstrucoes.addEventListener("click", function (evento) {
    let botao = evento.target.closest(".placed");
    if (botao) abrirDetalhes(botao.dataset.id);
  });

  mapaDeConstrucoes.addEventListener("dragstart", function (evento) {
    let botao = evento.target.closest(".placed");
    if (botao === null) return;
    construcaoArrastada = botao.dataset.id;
    evento.dataTransfer.setData("application/x-dragcit-building", construcaoArrastada);
  });

  listaDeConstrucoes.addEventListener("click", function (evento) {
    let botao = evento.target.closest(".building-row");
    if (botao) abrirDetalhes(botao.dataset.id);
  });

  busca.addEventListener("input", mostrarConstrucoes);
  filtro.addEventListener("change", mostrarConstrucoes);
  ordenacao.addEventListener("change", mostrarConstrucoes);
  formularioDetalhes.addEventListener("submit", salvarEdicao);
  campoNome.addEventListener("input", function () {
    campoNome.setCustomValidity("");
  });

  document.getElementById("closeDialog").addEventListener("click", fecharDetalhes);
  document.getElementById("deleteBuilding").addEventListener("click", excluirConstrucao);

  document.getElementById("removeMode").addEventListener("click", function () {
    modoRemover = !modoRemover;
    document.getElementById("removeMode").setAttribute("aria-pressed", modoRemover);
    document.getElementById("removeMode").classList.toggle("active", modoRemover);
    atualizarTipoSelecionado();
  });

  document.getElementById("save").addEventListener("click", salvarCidade);
  document.getElementById("clear").addEventListener("click", function () {
    if (cidade.buildings.length === 0) {
      mostrarMensagem("A cidade já está vazia.");
      return;
    }

    if (confirm("Limpar todas as construções da cidade?")) {
      cidade.buildings = [];
      salvarCidade();
      mostrarConstrucoes();
      mostrarMensagem("Cidade limpa. Comece uma nova construção!");
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

  // Mostra tudo que estava salvo quando o jogo abre.
  mostrarCatalogo();
  mostrarConstrucoes();
  configurarZoom(zoom);
  mostrarClima();
})();