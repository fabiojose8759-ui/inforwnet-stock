// ── CONFIG ──────────────────────────────────────────────
const SB_URL = 'https://cdqrweoqsjefyzowibjd.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkcXJ3ZW9xc2plZnl6b3dpYmpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2NzAwNjcsImV4cCI6MjA5NTI0NjA2N30.S7N6_D_SXAjnIBY3tbmN0cMzy5AvbIo3eIEGSo7p6Ss';
const sb = supabase.createClient(SB_URL, SB_KEY);

// ── STATE ────────────────────────────────────────────────
let produtos = [], categorias = [], movimentacoes = [], orders = [];
let selectedOS = { ent: null, sai: null };

// ── HELPERS ─────────────────────────────────────────────
const tipoLabel = {
  corretiva: 'Corretiva',
  instalacao_kit: 'Instalação Kit',
  preventiva: 'Preventiva',
  mudanca_endereco: 'Mudança End.'
};

const tipoClass = {
  corretiva: 'corretiva',
  instalacao_kit: 'instalacao',
  preventiva: 'preventiva',
  mudanca_endereco: 'mudanca'
};

function eqLabel(t) {
  if (!t) return '—';
  return t === 'equipe1' ? 'Equipe 1' : t === 'equipe2' ? 'Equipe 2' : t;
}

function fmtDate(d) {
  const dt = new Date(d);
  return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function fmtDateOnly(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
}

function toast(msg, type = 'ok') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast ' + type + ' show';
  setTimeout(() => t.classList.remove('show'), 3000);
}

function $(id) { return document.getElementById(id); }

// ── NAVIGATION ───────────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  $(id) && $(id).classList.add('active');
  document.querySelectorAll(`.nav-item[data-page="${id}"]`).forEach(n => n.classList.add('active'));
  document.querySelectorAll('.os-dropdown').forEach(d => d.style.display = 'none');
  if (id === 'page-historico') renderHistorico();
  if (id === 'page-dashboard') renderDash();
  if (id === 'page-produtos') renderProdutos();
}

function showTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  $(tabId) && ($(tabId).style.display = 'block');
  document.querySelector(`.tab[data-tab="${tabId}"]`) &&
    document.querySelector(`.tab[data-tab="${tabId}"]`).classList.add('active');
  if (tabId === 'tab-categorias') renderCatList();
}

// ── DATA LOAD ────────────────────────────────────────────
async function loadAll() {
  const syncEl = $('sync-txt');
  if (syncEl) syncEl.textContent = 'Sincronizando...';
  $('sync-pill') && $('sync-pill').classList.remove('ok');

  const [cats, prods, movs, ords] = await Promise.all([
    sb.from('estoque_categorias').select('*').order('nome'),
    sb.from('estoque_produtos').select('*, estoque_categorias(nome, cor, icone)').order('nome'),
    sb.from('estoque_movimentacoes').select('*, estoque_produtos(nome, unidade)').order('created_at', { ascending: false }).limit(500),
    sb.from('orders').select('id, num_os, os_date, team, tecnico, tipo').order('os_date', { ascending: false }).limit(300)
  ]);

  categorias = cats.data || [];
  produtos = prods.data || [];
  movimentacoes = movs.data || [];
  orders = ords.data || [];

  if (syncEl) syncEl.textContent = `${orders.length} OS · ${produtos.length} itens`;
  $('sync-pill') && $('sync-pill').classList.add('ok');
  $('last-update') && ($('last-update').textContent = 'Atualizado: ' + new Date().toLocaleTimeString('pt-BR'));

  populateSelects();
  updateNavBadge();
  renderDash();
  renderProdutos();
}

// ── POPULATE SELECTS ─────────────────────────────────────
function populateSelects() {
  const catOpts = categorias.map(c => `<option value="${c.id}">${c.icone} ${c.nome}</option>`).join('');

  const fcEl = $('filter-cat');
  if (fcEl) fcEl.innerHTML = '<option value="">Todas as categorias</option>' + catOpts;

  const ccEl = $('cad-cat');
  if (ccEl) ccEl.innerHTML = '<option value="">Sem categoria</option>' + catOpts;

  const pOpts = '<option value="">Selecione um produto...</option>' +
    produtos.map(p => `<option value="${p.id}">${p.nome} — ${p.estoque_atual} ${p.unidade}</option>`).join('');

  ['ent-produto', 'sai-produto'].forEach(id => { const el = $(id); if (el) el.innerHTML = pOpts; });

  const fpEl = $('fil-prod');
  if (fpEl) fpEl.innerHTML = '<option value="">Todos os produtos</option>' +
    produtos.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
}

function updateNavBadge() {
  const alertas = produtos.filter(p => p.estoque_atual <= p.estoque_minimo).length;
  const badge = $('nav-badge-alerta');
  if (badge) {
    badge.textContent = alertas;
    badge.style.display = alertas > 0 ? 'inline-block' : 'none';
  }
}

// ── DASHBOARD ────────────────────────────────────────────
function renderDash() {
  const baixo = produtos.filter(p => p.estoque_atual > 0 && p.estoque_atual <= p.estoque_minimo).length;
  const zero  = produtos.filter(p => p.estoque_atual <= 0).length;
  const hoje  = movimentacoes.filter(m => new Date(m.created_at).toDateString() === new Date().toDateString()).length;
  const todayStr = new Date().toISOString().slice(0, 10);
  const osHoje   = orders.filter(o => o.os_date === todayStr);

  $('m-total') && ($('m-total').textContent = produtos.length);
  $('m-baixo') && ($('m-baixo').textContent = baixo);
  $('m-zero')  && ($('m-zero').textContent  = zero);
  $('m-hoje')  && ($('m-hoje').textContent  = hoje);
  $('m-os-hoje') && ($('m-os-hoje').textContent = osHoje.length);
  $('dash-os-date') && ($('dash-os-date').textContent =
    new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }));

  // OS hoje
  const osList = $('dash-os-list');
  if (osList) {
    if (!osHoje.length) {
      osList.innerHTML = '<tr class="empty-row"><td colspan="5">Nenhuma OS registrada hoje</td></tr>';
    } else {
      osList.innerHTML = osHoje.map(o => `
        <tr>
          <td class="td-name">OS ${o.num_os}</td>
          <td><span class="badge ${tipoClass[o.tipo] || 'ok'}">${tipoLabel[o.tipo] || o.tipo}</span></td>
          <td>${eqLabel(o.team)}</td>
          <td style="color:var(--text2)">${o.tecnico && o.tecnico !== '—' ? o.tecnico : '—'}</td>
          <td><button class="btn sm" onclick="usarOSNaSaida(${o.id})">
            <i class="ti ti-arrow-bar-up"></i> Saída
          </button></td>
        </tr>`).join('');
    }
  }

  // Alertas
  const alertas = produtos.filter(p => p.estoque_atual <= p.estoque_minimo);
  const alEl = $('alertas-list');
  if (alEl) {
    if (!alertas.length) {
      alEl.innerHTML = '<div style="text-align:center;color:var(--text3);padding:24px;font-size:13px">Nenhum alerta — tudo em ordem!</div>';
    } else {
      alEl.innerHTML = alertas.map(p => `
        <div class="alerta-item">
          <span class="alerta-icon">${p.estoque_categorias?.icone || '📦'}</span>
          <div class="alerta-text">
            <div class="alerta-nome">${p.nome}</div>
            <div class="alerta-meta">${p.estoque_categorias?.nome || '—'} · Mínimo: ${p.estoque_minimo} ${p.unidade}</div>
          </div>
          <span class="badge ${p.estoque_atual <= 0 ? 'zero' : 'low'}">
            ${p.estoque_atual <= 0 ? 'Zerado' : 'Baixo'}: ${p.estoque_atual} ${p.unidade}
          </span>
        </div>`).join('');
    }
  }

  // Movimentações recentes
  const dm = $('dash-mov');
  if (dm) {
    const rec = movimentacoes.slice(0, 12);
    if (!rec.length) {
      dm.innerHTML = '<tr class="empty-row"><td colspan="6">Sem movimentações registradas</td></tr>';
    } else {
      dm.innerHTML = rec.map(m => `
        <tr>
          <td class="td-name">${m.estoque_produtos?.nome || '—'}</td>
          <td><span class="badge ${m.tipo}">${m.tipo}</span></td>
          <td>${m.quantidade} ${m.estoque_produtos?.unidade || ''}</td>
          <td style="color:var(--text2)">${m.os_numero || '—'}</td>
          <td style="color:var(--text2)">${m.tecnico || '—'}</td>
          <td style="color:var(--text3);font-size:12px;white-space:nowrap">${fmtDate(m.created_at)}</td>
        </tr>`).join('');
    }
  }
}

function usarOSNaSaida(id) {
  showPage('page-saida');
  setTimeout(() => selectOS('sai', id), 80);
}

// ── PRODUTOS ─────────────────────────────────────────────
function renderProdutos() {
  const q   = ($('search-prod')?.value || '').toLowerCase();
  const cat = $('filter-cat')?.value || '';
  const body = $('produtos-body');
  if (!body) return;

  let list = produtos.filter(p =>
    (!q   || p.nome.toLowerCase().includes(q) || (p.codigo || '').toLowerCase().includes(q)) &&
    (!cat || p.categoria_id === cat)
  );

  if (!list.length) {
    body.innerHTML = '<tr class="empty-row"><td colspan="7">Nenhum produto encontrado</td></tr>';
    return;
  }

  body.innerHTML = list.map(p => {
    const st    = p.estoque_atual <= 0 ? 'zero' : p.estoque_atual <= p.estoque_minimo ? 'low' : 'ok';
    const stTxt = p.estoque_atual <= 0 ? 'Zerado' : p.estoque_atual <= p.estoque_minimo ? 'Baixo' : 'OK';
    return `
      <tr>
        <td>
          <div class="td-name">${p.nome}</div>
          ${p.codigo ? `<div class="td-meta">${p.codigo}</div>` : ''}
          ${p.descricao ? `<div class="td-meta">${p.descricao}</div>` : ''}
        </td>
        <td style="font-size:12px">${p.estoque_categorias?.icone || ''} ${p.estoque_categorias?.nome || '—'}</td>
        <td style="font-size:12px">${p.unidade}</td>
        <td><strong>${p.estoque_atual}</strong></td>
        <td style="color:var(--text2)">${p.estoque_minimo}</td>
        <td><span class="badge ${st}">${stTxt}</span></td>
        <td>
          <div style="display:flex;gap:5px">
            <button class="btn sm" onclick="irEntrada('${p.id}')"><i class="ti ti-arrow-bar-to-down"></i></button>
            <button class="btn sm danger" onclick="irSaida('${p.id}')"><i class="ti ti-arrow-bar-up"></i></button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function irEntrada(id) {
  showPage('page-entrada');
  setTimeout(() => { $('ent-produto').value = id; }, 80);
}

function irSaida(id) {
  showPage('page-saida');
  setTimeout(() => { $('sai-produto').value = id; checkEstoque(); }, 80);
}

// ── HISTÓRICO ────────────────────────────────────────────
function renderHistorico() {
  const dias = parseInt($('fil-periodo')?.value || '30');
  const tipo = $('fil-tipo')?.value || '';
  const prod = $('fil-prod')?.value || '';
  const os   = ($('fil-os')?.value || '').toLowerCase();
  const cutoff = dias ? new Date(Date.now() - dias * 86400000) : null;

  let list = movimentacoes.filter(m => {
    if (cutoff && new Date(m.created_at) < cutoff) return false;
    if (tipo && m.tipo !== tipo) return false;
    if (prod && m.produto_id !== prod) return false;
    if (os   && !(m.os_numero || '').toLowerCase().includes(os)) return false;
    return true;
  });

  const body = $('hist-body');
  if (!body) return;

  if (!list.length) {
    body.innerHTML = '<tr class="empty-row"><td colspan="8">Nenhuma movimentação encontrada</td></tr>';
    return;
  }

  body.innerHTML = list.map(m => `
    <tr>
      <td style="font-size:12px;white-space:nowrap;color:var(--text2)">${fmtDate(m.created_at)}</td>
      <td class="td-name">${m.estoque_produtos?.nome || '—'}</td>
      <td><span class="badge ${m.tipo}">${m.tipo}</span></td>
      <td>${m.quantidade} ${m.estoque_produtos?.unidade || ''}</td>
      <td style="font-size:12px;color:var(--text2)">${m.motivo || '—'}</td>
      <td style="font-size:12px;font-weight:500">${m.os_numero ? 'OS ' + m.os_numero : '—'}</td>
      <td style="font-size:12px;color:var(--text2)">${m.tecnico || '—'}</td>
      <td style="font-size:12px;color:var(--text2)">${eqLabel(m.equipe)}</td>
    </tr>`).join('');
}

// ── OS PICKER ────────────────────────────────────────────
function filterOS(pre) {
  const q = ($(`${pre}-os-search`)?.value || '').toLowerCase();
  renderOSDropdown(pre, q);
}

function showOSDropdown(pre) {
  const q = ($(`${pre}-os-search`)?.value || '').toLowerCase();
  renderOSDropdown(pre, q);
}

function renderOSDropdown(pre, q) {
  const dd = $(`${pre}-os-dropdown`);
  if (!dd) return;

  let list = orders;
  if (q) list = orders.filter(o =>
    (o.num_os || '').toLowerCase().includes(q) ||
    (o.team   || '').toLowerCase().includes(q) ||
    (tipoLabel[o.tipo] || '').toLowerCase().includes(q) ||
    (o.tecnico || '').toLowerCase().includes(q)
  );

  if (!list.length) {
    dd.innerHTML = '<div class="os-option" style="color:var(--text3)">Nenhuma OS encontrada</div>';
  } else {
    dd.innerHTML = list.slice(0, 40).map(o => `
      <div class="os-option" onclick="selectOS('${pre}', ${o.id})">
        <div class="os-opt-num">
          <span>OS ${o.num_os}</span>
          <span class="badge ${tipoClass[o.tipo] || 'ok'}">${tipoLabel[o.tipo] || o.tipo}</span>
        </div>
        <div class="os-opt-meta">${fmtDateOnly(o.os_date)} · ${eqLabel(o.team)}${o.tecnico && o.tecnico !== '—' ? ' · ' + o.tecnico : ''}</div>
      </div>`).join('');
  }

  dd.style.display = 'block';
}

function selectOS(pre, id) {
  const o = orders.find(x => x.id === id);
  if (!o) return;
  selectedOS[pre] = o;

  const searchWrap = $(`${pre}-os-search-wrap`);
  const selBox     = $(`${pre}-os-selected`);

  if (searchWrap) searchWrap.style.display = 'none';
  if (selBox) {
    selBox.style.display = 'flex';
    selBox.innerHTML = `
      <div>
        <div class="os-sel-info">OS ${o.num_os} — ${tipoLabel[o.tipo] || o.tipo}</div>
        <div class="os-sel-meta">${fmtDateOnly(o.os_date)} · ${eqLabel(o.team)}${o.tecnico && o.tecnico !== '—' ? ' · ' + o.tecnico : ''}</div>
      </div>
      <button class="btn-clear" onclick="clearOS('${pre}')" title="Remover OS">✕</button>`;
  }

  $(`${pre}-os-dropdown`) && ($(`${pre}-os-dropdown`).style.display = 'none');

  if ($(`${pre}-os`))  $(`${pre}-os`).value  = o.num_os;
  if ($(`${pre}-tec`) && o.tecnico && o.tecnico !== '—') $(`${pre}-tec`).value = o.tecnico;
  const eq = $(`${pre}-equipe`);
  if (eq && o.team) eq.value = o.team;
}

function clearOS(pre) {
  selectedOS[pre] = null;
  const searchWrap = $(`${pre}-os-search-wrap`);
  const selBox     = $(`${pre}-os-selected`);
  if (searchWrap) searchWrap.style.display = 'block';
  if (selBox)     selBox.style.display     = 'none';
  [$(`${pre}-os-search`), $(`${pre}-os`), $(`${pre}-tec`)].forEach(el => { if (el) el.value = ''; });
  const eq = $(`${pre}-equipe`);
  if (eq) eq.value = '';
}

document.addEventListener('click', e => {
  if (!e.target.closest('.os-picker'))
    document.querySelectorAll('.os-dropdown').forEach(d => d.style.display = 'none');
});

// ── ESTOQUE CHECK ─────────────────────────────────────────
function checkEstoque() {
  const id = $('sai-produto')?.value;
  const p  = produtos.find(x => x.id === id);
  const al = $('sai-alerta');
  if (!al) return;
  if (p && p.estoque_atual <= 0) {
    al.className = 'alert danger'; al.style.display = 'block';
    al.textContent = 'Produto zerado no estoque!';
  } else if (p && p.estoque_atual <= p.estoque_minimo) {
    al.className = 'alert warning'; al.style.display = 'block';
    al.textContent = `Estoque baixo: apenas ${p.estoque_atual} ${p.unidade} restantes.`;
  } else {
    al.style.display = 'none';
  }
}

// ── SALVAR MOVIMENTAÇÃO ───────────────────────────────────
async function salvarMovimento(tipo) {
  const pre = tipo === 'entrada' ? 'ent' : 'sai';
  const produto_id = $(`${pre}-produto`)?.value;
  const quantidade = parseFloat($(`${pre}-qtd`)?.value);

  if (!produto_id) { toast('Selecione um produto', 'err'); return; }
  if (!quantidade || quantidade <= 0) { toast('Informe uma quantidade válida', 'err'); return; }

  if (tipo === 'saida') {
    const prod = produtos.find(p => p.id === produto_id);
    if (prod && prod.estoque_atual < quantidade) {
      const al = $('sai-alerta');
      if (al) {
        al.className = 'alert danger'; al.style.display = 'block';
        al.textContent = `Estoque insuficiente! Disponível: ${prod.estoque_atual} ${prod.unidade}.`;
      }
      return;
    }
    const al = $('sai-alerta');
    if (al) al.style.display = 'none';
  }

  const data = {
    produto_id, tipo, quantidade,
    motivo:     $(`${pre}-motivo`)?.value || null,
    os_numero:  $(`${pre}-os`)?.value     || null,
    tecnico:    $(`${pre}-tec`)?.value    || null,
    equipe:     $(`${pre}-equipe`)?.value || null,
    observacao: $(`${pre}-obs`)?.value    || null,
  };

  const { error } = await sb.from('estoque_movimentacoes').insert([data]);
  if (error) { toast('Erro ao salvar: ' + error.message, 'err'); return; }

  toast(tipo === 'entrada' ? '✓ Entrada registrada!' : '✓ Saída registrada!', 'ok');
  clearOS(pre);
  $(`${pre}-produto`) && ($(`${pre}-produto`).value = '');
  $(`${pre}-qtd`)     && ($(`${pre}-qtd`).value     = '');
  $(`${pre}-obs`)     && ($(`${pre}-obs`).value     = '');
  await loadAll();
}

// ── CADASTRAR PRODUTO ────────────────────────────────────
async function cadastrarProduto() {
  const nome = $('cad-nome')?.value.trim();
  if (!nome) { toast('Nome é obrigatório', 'err'); return; }

  const estoque_inicial = parseFloat($('cad-estoq')?.value) || 0;
  const data = {
    nome,
    codigo:      $('cad-cod')?.value  || null,
    categoria_id:$('cad-cat')?.value  || null,
    unidade:     $('cad-unid')?.value || 'un',
    estoque_atual:  estoque_inicial,
    estoque_minimo: parseFloat($('cad-min')?.value) || 0,
    descricao:   $('cad-desc')?.value || null,
  };

  const { data: ins, error } = await sb.from('estoque_produtos').insert([data]).select('id').single();
  if (error) { toast('Erro: ' + error.message, 'err'); return; }

  if (estoque_inicial > 0 && ins) {
    await sb.from('estoque_movimentacoes').insert([{
      produto_id: ins.id, tipo: 'entrada',
      quantidade: estoque_inicial, motivo: 'Estoque inicial'
    }]);
  }

  toast('✓ Produto cadastrado!', 'ok');
  ['cad-nome', 'cad-cod', 'cad-desc'].forEach(id => { const el = $(id); if (el) el.value = ''; });
  $('cad-estoq') && ($('cad-estoq').value = '0');
  $('cad-min')   && ($('cad-min').value   = '0');
  await loadAll();
}

// ── CATEGORIAS ───────────────────────────────────────────
function renderCatList() {
  const el = $('cat-list');
  if (!el) return;
  if (!categorias.length) {
    el.innerHTML = '<div style="text-align:center;color:var(--text3);padding:24px">Nenhuma categoria</div>';
    return;
  }
  el.innerHTML = categorias.map(c => `
    <div class="cat-item">
      <span style="font-size:22px">${c.icone}</span>
      <span style="font-weight:500;font-size:13px">${c.nome}</span>
      <span class="cat-count">${produtos.filter(p => p.categoria_id === c.id).length} produtos</span>
    </div>`).join('');
}

// ── INIT ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Nav click
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => showPage(item.dataset.page));
  });

  // Tabs
  document.querySelectorAll('.tab[data-tab]').forEach(tab => {
    tab.addEventListener('click', () => showTab(tab.dataset.tab));
  });

  loadAll();
});
