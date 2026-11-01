# 🚀 Kanban Flow — InMoov Hand Control (TCC)

Aplicação web de gerenciamento de projetos baseada na metodologia **Kanban**, com arquitetura **100% Client-Side (Estática)**, persistência local via `localStorage` e compatibilidade direta com o **GitHub Pages** e com execução direta no navegador (`file://`).

---

## ✨ Principais Características

1. **Arquitetura 100% Client-Side (Zero Servidor/Backend)**:
   - Operações completas de **CRUD** (criar, visualizar, editar, mover e excluir quadros, colunas, cartões, subtarefas, etiquetas e links) executadas diretamente no navegador.
   - Persistência automática utilizando `localStorage` (`js/db.js`), com dados iniciais pré-populados na primeira execução e fallback automático em memória.
2. **Fluxo Padrão de Ciclo de Vida de Projeto (5 Etapas)**:
   - **Backlog** (*Demandas pendentes*)
   - **A Fazer / To Do** (*Planejado para execução imediata*)
   - **Em Andamento / In Progress** (*Tarefas em desenvolvimento*)
   - **Revisão / Homologação** (*Testes, validação e QA*)
   - **Concluído / Done** (*Entregas finalizadas*)
3. **Quadros Pré-Configurados**:
   - **TCC — InMoov Hand Control**: 102 tarefas técnicas distribuídas nas 5 etapas do ciclo de vida (64 concluídas, 12 em revisão/homologação, 9 em andamento, 13 a fazer e 4 no backlog).
   - **🚀 Projeto: Kanban Flow — Entrega Estática**: quadro demonstrativo com 10 cartões exemplificando todas as etapas de entrega.
4. **Múltiplas Visualizações & Recursos Avançados**:
   - **Quadro Kanban** com Drag & Drop fluido entre colunas e menu rápido de transferência.
   - **Visão em Lista**, **Dashboard Executivo** e **Métricas de Produtividade**.
   - **Busca Global (`Ctrl+K`)**, filtros combinados, modo escuro/claro (`D`), efeitos sonoros via *Web Audio API*, celebração com confetes e exportação/importação de backup (`.json` e `.md`).

---

## 📁 Estrutura de Arquivos

```text
kanban/
├── index.html                    # Entrada principal (caminhos 100% relativos)
├── assets/
│   ├── favicon.svg               # Ícone vetorial da aplicação
│   ├── icons.svg                 # Sprites auxiliares
│   └── tcc-inmoov-backup.json    # Arquivo de backup completo de referência
├── css/
│   └── styles.css                # Estilos customizados, temas Dark/Light e animações
├── data/
│   └── initialData.js            # Dados iniciais (TCC InMoov + Quadro Demo em 5 colunas)
└── js/
    ├── utils.js                  # Utilitários de datas, cores, ícones SVG, áudio e confetes
    ├── db.js                     # Camada de persistência Client-Side via localStorage
    └── app.js                    # Controlador principal, CRUD, Drag & Drop e renderização
```

---

## 💻 Como Executar Localmente

### Opção 1: Abertura Direta (Sem Servidor / Dois Cliques)
Como o projeto não utiliza módulos ES bloqueados por CORS nem requisições `fetch()` locais obrigatórias:
1. Abra a pasta do projeto no Explorador de Arquivos.
2. Dê **dois cliques** no arquivo [`index.html`](./index.html) para abri-lo diretamente no navegador (`file://`).

### Opção 2: Servidor Estático Local (Opcional)
Caso deseje testar simulando a URL de hospedagem do GitHub Pages:
```bash
# Usando Python (nativo na maioria dos sistemas)
python -m http.server 8080

# Ou usando Node.js (npx serve)
npx serve .
```
Em seguida, acesse `http://localhost:8080`.

---

## 🌐 Como Publicar no GitHub Pages (Passo a Passo)

Todos os caminhos no [`index.html`](./index.html) utilizam links relativos (`./assets/...`, `./css/...`, `./js/...`), evitando erros `404 Not Found` quando hospedado em subpastas de repositórios (`https://seu-usuario.github.io/nome-do-repositorio/`).

### Método 1: Publicar direto da raiz (`/root`) na branch `main` (Recomendado)
1. Suba os arquivos do projeto para o seu repositório no GitHub:
   ```bash
   git add index.html assets/ css/ data/ js/ README.md
   git commit -m "feat: migra Kanban para arquitetura 100% estática compatível com GitHub Pages"
   git push origin main
   ```
2. No GitHub, abra o repositório e clique em **Settings** (Configurações) no menu superior.
3. No menu lateral esquerdo, clique em **Pages**.
4. Em **Build and deployment** > **Source**, mantenha selecionado **Deploy from a branch**.
5. Em **Branch**, selecione:
   - Branch: **`main`** (ou `master`)
   - Pasta: **`/ (root)`**
   - Clique em **Save**.
6. Aguarde cerca de 1 minuto e acesse o link público gerado pelo GitHub Pages!

### Método 2: Usando branch dedicada `gh-pages` ou pasta `/docs`
- **Via pasta `/docs`**: se preferir isolar os arquivos publicados na pasta `/docs` da branch `main`, basta copiar `index.html`, `assets/`, `css/`, `data/` e `js/` para dentro de uma pasta `docs/` e selecionar **`main` / `/docs`** em **Settings > Pages**.
- **Via branch `gh-pages`**: crie e envie os arquivos para a branch `gh-pages` (`git checkout -b gh-pages && git push origin gh-pages`) e selecione a branch **`gh-pages` / `/ (root)`** em **Settings > Pages**.

