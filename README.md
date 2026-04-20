# 🎯 AimForge — Aim Trainer

## 📌 Sobre o Projeto

O **AimForge** é um jogo web de treino de mira (aim trainer) desenvolvido **100% em frontend (HTML, CSS e JavaScript puro)**.

Este projeto foi criado com um propósito específico: **testar a capacidade de geração de código de uma IA**, avaliando sua habilidade em construir uma aplicação completa, funcional e bem estruturada apenas a partir de um prompt detalhado.

---

## 🤖 Objetivo do Experimento com IA

O projeto foi utilizado como benchmark para analisar:

- Capacidade da IA em estruturar um projeto frontend completo
- Organização e qualidade do código gerado
- Implementação de lógica de jogo (game loop, eventos, estados)
- Criação de UI/UX moderna e responsiva
- Uso de APIs nativas do navegador (ex: Web Audio API, Canvas, LocalStorage)
- Separação de responsabilidades (HTML, CSS e JS)

---

## 🚀 Funcionalidades Implementadas

### 🎮 Mecânica do Jogo
- Alvos aparecem em posições aleatórias
- Clique para acertar o alvo
- Cliques fora contam como erro
- Sistema de spawn dinâmico

---

### 📊 Sistema de Pontuação
- Pontuação em tempo real
- Contagem de:
  - Acertos (hits)
  - Erros (misses)
- Cálculo de precisão (%)
- Sistema de combo com bônus progressivo

---

### ⚡ Tempo de Reação
- Medição precisa em milissegundos
- Exibição de:
  - Tempo médio
  - Melhor tempo
- Indicador visual em tempo real

---

### 🎯 Modos de Jogo
- **Clássico** → tempo fixo
- **Sobrevivência** → penalidade por erro
- **Precisão** → número limitado de tiros
- **Velocidade** → alvos desaparecem rapidamente

---

### 🎚️ Níveis de Dificuldade
- Fácil
- Médio
- Difícil

Alterações dinâmicas:
- Tamanho do alvo
- Tempo de spawn
- Tempo de permanência

---

### 🧠 Estatísticas Avançadas
- Combo máximo
- Histórico de reações
- Gráfico de desempenho (Canvas)
- FPS em tempo real

---

### 💾 Persistência de Dados
Utiliza `localStorage` para salvar:
- Melhor pontuação
- Melhor tempo de reação
- Melhor precisão
- Ranking local (Top 10)

---

### 🏆 Ranking Local
- Armazena partidas anteriores
- Ordenação por pontuação
- Exibe modo, dificuldade e data

---

### 🔊 Feedback Sonoro
- Som ao acertar
- Som ao errar
- Feedback de combo
- Sons de início e fim de jogo

---

### 🎨 Interface (UI/UX)
- Tema dark com estilo gamer
- Cores neon (cyberpunk)
- Animações suaves
- Feedback visual (hit/miss)
- Totalmente responsivo

---

## 🛠️ Tecnologias Utilizadas

- **HTML5**
- **CSS3 (com animações e variáveis CSS)**
- **JavaScript Vanilla**
- **Web Audio API**
- **Canvas API**
- **LocalStorage**

---

## 📁 Estrutura do Projeto

```
/aimforge
│── index.html
│── style.css
│── script.js
```

---

## ▶️ Como Executar

1. Baixe ou clone o projeto
2. Abra o arquivo `index.html` no navegador

Não é necessário servidor ou instalação de dependências.

---

## 📈 Conclusão do Teste com IA

O resultado demonstra que a IA foi capaz de:

- Criar um sistema completo e funcional
- Implementar lógica relativamente complexa
- Produzir uma interface moderna
- Utilizar múltiplas APIs do navegador

Este projeto serve como um **exemplo prático do nível atual de capacidade de geração de código por IA**, especialmente para aplicações frontend interativas.

---

## ⚠️ Observações

- O código foi gerado por IA e pode conter pontos de melhoria
- Não foi inicialmente projetado para produção
- Ideal para estudo, testes e experimentação

---

## 📌 Possíveis Melhorias Futuras

- Backend para ranking global
- Sistema de login
- Multiplayer competitivo
- Mais modos de treino
- Analytics avançado

---

## 🧪 Status

✔ Projeto funcional  
✔ Testado em navegador  
✔ Pronto para uso local  

---

## 👨‍💻 Autor

Projeto gerado com auxílio de Inteligência Artificial para fins de teste e avaliação técnica.