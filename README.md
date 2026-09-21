# Figurinhas Brasileirão 2026

Controle online e gratuito do álbum de figurinhas **Panini Brasileirão 2026** (Séries A e B): marque o que você já tem, veja o que falta, acompanhe o progresso e organize trocas de repetidas com amigos.

**Acesse:** https://lucasramos-developer.github.io/figurinhas-brasileirao-2026/

Funciona no celular (mobile first) e no computador, **offline** e **sem cadastro**. Dá para instalar como app (PWA) na tela inicial.

## O que dá para fazer

- **Marcar figurinhas:** toque = *tenho*, toque de novo = *repetida*, **segure** = tirar uma. No computador: clique, e Shift+clique ou botão direito para tirar.
- **Progresso** do álbum (512 figurinhas) e dos cards (98) sempre visível no topo.
- **Busca** por time, código ou número (ex.: `233`, `E5`) e filtros **Faltam / Repetidas / Separadas**.
- **Escudos** dos 40 clubes das Séries A e B.
- **Accordion por time:** recolha o time que já revisou numa troca (o estado fica salvo no aparelho).
- **Compartilhar minha lista** pelo WhatsApp (repetidas + faltantes) e **colar** a lista de outra pessoa para ver o que você tem para oferecer e o que ela tem para você.
- **Restaurar a coleção** colando de volta uma lista gerada pelo próprio app.
- **Modo separando** e **listas por amigo:** separe as repetidas de cada troca e marque como entregues.
- **Desfazer** em ações grandes (entregar, importar, restaurar).
- **Backup** em JSON (exportar/importar) e tema claro/escuro (segue o sistema).

## Como funciona a lista compartilhada

O texto gerado por *Compartilhar minha lista* tem este formato:

```
Brasileirão 2026 — álbum 120/512 · cards 4/98

REPETIDAS
FLA
2 (x2), 3

FALTAM
FLA
E1, 4, 5, 6
Cards
E
E05, E10
```

- Jogadores e painéis são números soltos (`45, 102`); escudo, CB, Mascote e Cards usam código + número (`E5`, `CB12`, `M3`, `D01`).
- `(x2)` indica quantas repetidas extras existem.
- Ao colar no app, as seções `REPETIDAS`, `FALTAM` e `Cards` são reconhecidas. Listas simples (só números/códigos) também funcionam.

## Dados e privacidade

Tudo fica no **localStorage do seu navegador**; não há servidor nem conta. Limpar os dados do site apaga a coleção, então use **Exportar dados (JSON)** ou **Compartilhar minha lista** de vez em quando como backup.

## Rodando localmente

Não há build nem dependências: é HTML, CSS e JavaScript puro.

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

O service worker só funciona em `localhost` ou HTTPS.

## Estrutura

| Arquivo | Função |
| --- | --- |
| `index.html` | Marcação, metadados (SEO/PWA) e modais |
| `style.css` | Estilos (tema claro/escuro, mobile first) |
| `script.js` | Lógica: estado, renderização, filtros, importação/compartilhamento |
| `data.js` | Definição do álbum (times, seções, numeração) e mapa de escudos |
| `sw.js` | Service worker (rede primeiro, cache como reserva offline) |
| `manifest.json` | Manifesto do PWA |
| `icons/` | Ícones do app; `icons/escudos/` tem os escudos dos clubes |

Para corrigir ou ajustar a numeração do álbum, edite `data.js` (o esquema de identificação está documentado no topo do arquivo).

## Publicação

Publicado com **GitHub Pages** a partir da branch `main`. Ao alterar arquivos do app, o service worker passa a servir a versão nova na próxima abertura online.

## Créditos e avisos

- Projeto de fã, **sem vínculo** com a Panini, a CBF ou os clubes. Nomes, escudos e marcas pertencem aos seus respectivos donos.
- Escudos obtidos em [footylogos.com](https://www.footylogos.com/).
- Ícones de interface no estilo [Lucide](https://lucide.dev/) (licença MIT), embutidos em SVG.

Feito por [Lucas Ramos](https://github.com/LucasRamos-Developer).
