# Estoque Inforwnet Telecom

Aplicacao web estatica para controle de estoque, produtos, categorias, ordens de servico e movimentacoes.

## Como abrir

Abra o arquivo `index.html` no navegador.

## Estrutura

- `index.html`: pagina principal da aplicacao.
- `assets/css/style.css`: estilos da interface atual.
- `assets/js/app.js`: logica da aplicacao e integracao com Supabase.
- `archive/legacy/`: arquivos antigos preservados para consulta.

## Observacoes

- A aplicacao usa Supabase pelo SDK carregado via CDN.
- A chave presente no JavaScript deve ser uma chave publica `anon`; nao coloque chaves `service_role` ou segredos privados no frontend.
