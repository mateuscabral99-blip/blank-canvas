Criar uma página única na rota `/` com uma tela completamente em branco e responsiva.

### O que será feito
- Substituir o conteúdo de `src/pages/Index.tsx` (atualmente um placeholder com imagem) por uma página vazia.
- A página ocupa 100% da largura e altura em qualquer dispositivo (desktop, tablet, mobile).
- Fundo usando o token `bg-background` do design system, sem textos, imagens ou componentes.
- Demais arquivos permanecem inalterados.

### Detalhes técnicos
- `src/pages/Index.tsx`: retorna `<div className="min-h-screen w-full bg-background" />`.