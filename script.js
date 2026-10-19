const startButton = document.querySelector("#startButton");

startButton.addEventListener("click", () => {
  // Primeira versão: o botão confirma a ação e prepara a próxima etapa do jogo.
  // Depois, esta interação poderá abrir a tela real de construção da cidade.
  startButton.querySelector("span:first-child").textContent = "Vamos construir!";
  startButton.querySelector(".button-arrow").textContent = "✓";
  document.querySelector(".description").textContent =
    "Sua aventura está começando! A próxima etapa será montar o mapa e arrastar construções para criar sua cidade.";
  document.querySelector(".eyebrow").innerHTML = "<span>✦</span> PREPARE-SE, PREFEITO!";
  startButton.setAttribute("aria-label", "Jogo iniciado. Próxima etapa: construir sua cidade.");
});
