const SB_URL='https://cdqrweoqsjefyzowibjd.supabase.co';
const SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkcXJ3ZW9xc2plZnl6b3dpYmpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2NzAwNjcsImV4cCI6MjA5NTI0NjA2N30.S7N6_D_SXAjnIBY3tbmN0cMzy5AvbIo3eIEGSo7p6Ss';
const sb=supabase.createClient(SB_URL,SB_KEY);
let produtos=[],categorias=[],movimentacoes=[],orders=[];
let selectedOS={ent:null,sai:null,vei:null};
const tipoLabel={corretiva:'Corretiva',instalacao_kit:'Instalação Kit',preventiva:'Preventiva',mudanca_endereco:'Mudança End.'};
const tipoClass={corretiva:'corretiva',instalacao_kit:'instalacao',preventiva:'preventiva',mudanca_endereco:'mudanca'};
function eqLabel(t){return!t?'—':t==='equipe1'?'Equipe 1':t==='equipe2'?'Equipe 2':t}
function fmtDate(d){const dt=new Date(d);return dt.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})+' '+dt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
function fmtDateOnly(d){return new Date(d+'T00:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'})}
function toast(msg,type='ok'){const t=document.getElementById('toast');t.textContent=msg;t.className='toast '+type+' show';setTimeout(()=>t.classList.remove('show'),3000)}
function $(id){return document.getElementById(id)}

// Clock
setInterval(()=>{const el=$('topbar-time');if(el)el.textContent=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})},1000);
window.onload=()=>{const el=$('topbar-time');if(el)el.textContent=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})};

function showPage(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.querySelectorAll('.menu-link').forEach(n=>n.classList.remove('active'));
  $(id)&&$(id).classList.add('active');
  document.querySelectorAll(`.nav-item[data-page="${id}"]`).forEach(n=>n.classList.add('active'));
  document.querySelectorAll(`.menu-link[data-page="${id}"]`).forEach(n=>n.classList.add('active'));
  document.querySelectorAll('.os-dropdown').forEach(d=>d.style.display='none');
  if(id==='page-historico')renderHistorico();
  if(id==='page-dashboard')renderDash();
  if(id==='page-galeria')renderGaleria();
  if(id==='page-produtos')renderProdutos();
  if(id==='page-consultas')renderConsultas();
}

function showTab(tabId){
  document.querySelectorAll('.tab-content').forEach(t=>t.style.display='none');
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  $(tabId)&&($(tabId).style.display='block');
  document.querySelector(`.tab[data-tab="${tabId}"]`)&&document.querySelector(`.tab[data-tab="${tabId}"]`).classList.add('active');
  if(tabId==='tab-categorias')renderCatList();
  if(tabId==='gal-movimentacoes'||tabId==='gal-produtos')renderGaleria();
}

async function loadAll(){
  const chip=$('sync-chip');const txt=$('sync-txt');
  if(chip)chip.classList.remove('ok');if(txt)txt.textContent='Sincronizando...';
  const[cats,prods,movs,ords]=await Promise.all([
    sb.from('estoque_categorias').select('*').order('nome'),
    sb.from('estoque_produtos').select('*,estoque_categorias(nome,cor,icone)').order('nome'),
    sb.from('estoque_movimentacoes').select('*,estoque_produtos(nome,unidade)').order('created_at',{ascending:false}).limit(500),
    sb.from('orders').select('id,num_os,os_date,team,tecnico,tipo').order('os_date',{ascending:false}).limit(300)
  ]);
  categorias=cats.data||[];produtos=prods.data||[];movimentacoes=movs.data||[];orders=ords.data||[];
  if(txt)txt.textContent=`${orders.length} OS · ${produtos.length} itens`;
  if(chip)chip.classList.add('ok');
  $('last-update')&&($('last-update').textContent='Sync: '+new Date().toLocaleTimeString('pt-BR'));
  populateSelects();updateNavBadge();renderDash();renderProdutos();
}

function populateSelects(){
  const catOpts=categorias.map(c=>`<option value="${c.id}">${c.nome}</option>`).join('');
  const fc=$('filter-cat');if(fc)fc.innerHTML='<option value="">Todas as categorias</option>'+catOpts;
  const cc=$('cad-cat');if(cc)cc.innerHTML='<option value="">Sem categoria</option>'+catOpts;
  const pOpts='<option value="">Selecione...</option>'+produtos.map(p=>`<option value="${p.id}">${p.nome} — ${p.estoque_atual} ${p.unidade}</option>`).join('');
  ['ent-produto','sai-produto','vei-produto'].forEach(id=>{const el=$(id);if(el)el.innerHTML=pOpts});
  const fp=$('fil-prod');if(fp)fp.innerHTML='<option value="">Todos</option>'+produtos.map(p=>`<option value="${p.id}">${p.nome}</option>`).join('');
}

function updateNavBadge(){
  const a=produtos.filter(p=>p.estoque_atual<=p.estoque_minimo).length;
  const b=$('nav-badge-alerta');if(b){b.textContent=a;b.style.display=a>0?'inline-block':'none'}
}

function renderDash(){
  const baixo=produtos.filter(p=>p.estoque_atual>0&&p.estoque_atual<=p.estoque_minimo).length;
  const zero=produtos.filter(p=>p.estoque_atual<=0).length;
  const hoje=movimentacoes.filter(m=>new Date(m.created_at).toDateString()===new Date().toDateString()).length;
  const todayStr=new Date().toISOString().slice(0,10);
  const osHoje=orders.filter(o=>o.os_date===todayStr);
  $('m-total')&&($('m-total').textContent=produtos.length);
  $('m-baixo')&&($('m-baixo').textContent=baixo);
  $('m-zero')&&($('m-zero').textContent=zero);
  $('m-hoje')&&($('m-hoje').textContent=hoje);
  $('m-os-hoje')&&($('m-os-hoje').textContent=osHoje.length);
  $('dash-os-date')&&($('dash-os-date').textContent=new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}));
  const osList=$('dash-os-list');
  if(osList)osList.innerHTML=!osHoje.length?'<tr class="empty-row"><td colspan="5">Nenhuma OS registrada hoje</td></tr>':osHoje.map(o=>`<tr><td class="td-name">OS ${o.num_os}</td><td><span class="badge ${tipoClass[o.tipo]||'ok'}">${tipoLabel[o.tipo]||o.tipo}</span></td><td style="color:var(--c-text2)">${eqLabel(o.team)}</td><td style="color:var(--c-text3)">${o.tecnico&&o.tecnico!=='—'?o.tecnico:'—'}</td><td><button class="btn sm" onclick="usarOSNaSaida(${o.id})"><i class="ti ti-arrow-bar-up"></i> Saída</button></td></tr>`).join('');
  const al=$('alertas-list');
  const alertas=produtos.filter(p=>p.estoque_atual<=p.estoque_minimo);
  if(al)al.innerHTML=!alertas.length?'<div style="text-align:center;color:var(--c-text3);padding:32px;font-family:var(--font-mono);font-size:12px">✓ Tudo em ordem — nenhum alerta</div>':alertas.map(p=>`<div class="alerta-item"><div class="alerta-icon"><i class="ti ti-package" style="font-size:18px;color:var(--c-text3)"></i></div><div style="flex:1"><div class="alerta-nome">${p.nome}</div><div class="alerta-meta">${p.estoque_categorias?.nome||'—'} · min: ${p.estoque_minimo} ${p.unidade}</div></div><span class="badge ${p.estoque_atual<=0?'zero':'low'}">${p.estoque_atual<=0?'ZERADO':'BAIXO'} ${p.estoque_atual} ${p.unidade}</span></div>`).join('');
  const dm=$('dash-mov');
  if(dm){const rec=movimentacoes.slice(0,12);dm.innerHTML=!rec.length?'<tr class="empty-row"><td colspan="6">Sem movimentações</td></tr>':rec.map(m=>`<tr><td class="td-name">${m.estoque_produtos?.nome||'—'}</td><td><span class="badge ${m.tipo}">${m.tipo}</span></td><td style="font-family:var(--font-mono);font-size:12px">${m.quantidade} ${m.estoque_produtos?.unidade||''}</td><td style="color:var(--c-text3);font-family:var(--font-mono);font-size:12px">${m.os_numero?'#'+m.os_numero:'—'}</td><td style="color:var(--c-text2)">${m.tecnico||'—'}</td><td style="color:var(--c-text3);font-size:11px;font-family:var(--font-mono);white-space:nowrap">${fmtDate(m.created_at)}</td></tr>`).join('')}
}

function usarOSNaSaida(id){showPage('page-saida');setTimeout(()=>selectOS('sai',id),80)}

function renderProdutos(){
  const q=($('search-prod')?.value||'').toLowerCase();
  const cat=$('filter-cat')?.value||'';
  const body=$('produtos-body');if(!body)return;
  let list=produtos.filter(p=>(!q||p.nome.toLowerCase().includes(q)||(p.codigo||'').toLowerCase().includes(q))&&(!cat||p.categoria_id===cat));
  if(!list.length){body.innerHTML='<tr class="empty-row"><td colspan="7">Nenhum produto encontrado</td></tr>';return}
  body.innerHTML=list.map(p=>{
    const st=p.estoque_atual<=0?'zero':p.estoque_atual<=p.estoque_minimo?'low':'ok';
    const stTxt=p.estoque_atual<=0?'ZERADO':p.estoque_atual<=p.estoque_minimo?'BAIXO':'OK';
    return`<tr><td><div style="display:flex;align-items:center;gap:10px">${p.foto_url?`<img src="${p.foto_url}" class="photo-thumb" onclick="abrirFoto('${p.foto_url}')" alt="foto">`:''}<div><div class="td-name">${p.nome}</div>${p.codigo?`<div class="td-meta">${p.codigo}</div>`:''}</div></div></td><td style="font-size:12px;color:var(--c-text2)">${p.estoque_categorias?.nome||'—'}</td><td style="font-family:var(--font-mono);font-size:12px;color:var(--c-text3)">${p.unidade}</td><td style="font-family:var(--font-mono);font-weight:600;font-size:15px">${p.estoque_atual}</td><td style="font-family:var(--font-mono);font-size:12px;color:var(--c-text3)">${p.estoque_minimo}</td><td><span class="badge ${st}">${stTxt}</span></td><td></td></tr>`;
  }).join('');
}

function renderConsultas(){
  const q=($('consulta-tec')?.value||'').toLowerCase();
  const equipe=$('consulta-equipe')?.value||'';
  const resumo={};
  movimentacoes.forEach(m=>{
    const tec=(m.tecnico||'Sem técnico').trim()||'Sem técnico';
    if(q&&!tec.toLowerCase().includes(q))return;
    if(equipe&&m.equipe!==equipe)return;
    const key=tec+'|'+(m.equipe||'');
    if(!resumo[key])resumo[key]={tec,equipe:m.equipe||'',entrada:0,saida:0,ultima:m.created_at};
    resumo[key][m.tipo==='entrada'?'entrada':'saida']+=Number(m.quantidade)||0;
    if(new Date(m.created_at)>new Date(resumo[key].ultima))resumo[key].ultima=m.created_at;
  });
  const tb=$('consulta-tec-body');
  const linhas=Object.values(resumo).sort((a,b)=>new Date(b.ultima)-new Date(a.ultima));
  if(tb)tb.innerHTML=!linhas.length?'<tr class="empty-row"><td colspan="5">Nenhum movimento encontrado</td></tr>':linhas.map(r=>`<tr><td class="td-name">${r.tec}</td><td>${eqLabel(r.equipe)}</td><td><span class="badge entrada">${r.entrada}</span></td><td><span class="badge saida">${r.saida}</span></td><td style="color:var(--c-text3);font-family:var(--font-mono);font-size:12px">${fmtDate(r.ultima)}</td></tr>`).join('');
  const pb=$('consulta-prod-body');
  if(pb)pb.innerHTML=!produtos.length?'<tr class="empty-row"><td colspan="5">Nenhum produto cadastrado</td></tr>':produtos.map(p=>{
    const st=p.estoque_atual<=0?'zero':p.estoque_atual<=p.estoque_minimo?'low':'ok';
    const stTxt=p.estoque_atual<=0?'ZERADO':p.estoque_atual<=p.estoque_minimo?'BAIXO':'OK';
    return`<tr><td class="td-name">${p.nome}</td><td style="color:var(--c-text2)">${p.estoque_categorias?.nome||'—'}</td><td style="font-family:var(--font-mono)">${p.estoque_atual} ${p.unidade}</td><td style="color:var(--c-text3);font-family:var(--font-mono)">${p.estoque_minimo}</td><td><span class="badge ${st}">${stTxt}</span></td></tr>`;
  }).join('');
}

function irEntrada(id){showPage('page-entrada');setTimeout(()=>{$('ent-produto').value=id},80)}
function irSaida(id){showPage('page-saida');setTimeout(()=>{$('sai-produto').value=id;checkEstoque()},80)}

function renderHistorico(){
  const dias=parseInt($('fil-periodo')?.value||'30');
  const tipo=$('fil-tipo')?.value||'';
  const prod=$('fil-prod')?.value||'';
  const os=($('fil-os')?.value||'').toLowerCase();
  const cutoff=dias?new Date(Date.now()-dias*86400000):null;
  let list=movimentacoes.filter(m=>{
    if(cutoff&&new Date(m.created_at)<cutoff)return false;
    if(tipo&&m.tipo!==tipo)return false;
    if(prod&&m.produto_id!==prod)return false;
    if(os&&!(m.os_numero||'').toLowerCase().includes(os))return false;
    return true;
  });
  const body=$('hist-body');if(!body)return;
  if(!list.length){body.innerHTML='<tr class="empty-row"><td colspan="8">Nenhuma movimentação encontrada</td></tr>';return}
  body.innerHTML=list.map(m=>`<tr><td style="font-size:11px;white-space:nowrap;color:var(--c-text3);font-family:var(--font-mono)">${fmtDate(m.created_at)}</td><td class="td-name">${m.estoque_produtos?.nome||'—'}</td><td><span class="badge ${m.tipo}">${m.tipo}</span></td><td style="font-family:var(--font-mono);font-size:12px">${m.quantidade} ${m.estoque_produtos?.unidade||''}</td><td style="font-size:12px;color:var(--c-text2)">${m.motivo||'—'}</td><td style="font-size:12px;font-weight:500;font-family:var(--font-mono);color:var(--c-blue)">${m.os_numero?'#'+m.os_numero:'—'}</td><td style="font-size:12px;color:var(--c-text2)">${m.tecnico||'—'}</td><td style="font-size:12px;color:var(--c-text3)">${eqLabel(m.equipe)}</td><td>${m.foto_url?`<img src="${m.foto_url}" class="photo-thumb" onclick="abrirFoto('${m.foto_url}')" alt="foto">`:'—'}</td></tr>`).join('');
}

function filterOS(pre){const q=($(`${pre}-os-search`)?.value||'').toLowerCase();renderOSDropdown(pre,q)}
function showOSDropdown(pre){const q=($(`${pre}-os-search`)?.value||'').toLowerCase();renderOSDropdown(pre,q)}
function renderOSDropdown(pre,q){
  const dd=$(`${pre}-os-dropdown`);if(!dd)return;
  let list=q?orders.filter(o=>(o.num_os||'').toLowerCase().includes(q)||(o.team||'').toLowerCase().includes(q)||(tipoLabel[o.tipo]||'').toLowerCase().includes(q)||(o.tecnico||'').toLowerCase().includes(q)):orders;
  dd.innerHTML=!list.length?'<div class="os-option" style="color:var(--c-text3);font-family:var(--font-mono);font-size:12px">Nenhuma OS encontrada</div>':list.slice(0,40).map(o=>`<div class="os-option" onclick="selectOS('${pre}',${o.id})"><div class="os-opt-num"><span>OS ${o.num_os}</span><span class="badge ${tipoClass[o.tipo]||'ok'}">${tipoLabel[o.tipo]||o.tipo}</span></div><div class="os-opt-meta">${fmtDateOnly(o.os_date)} · ${eqLabel(o.team)}${o.tecnico&&o.tecnico!=='—'?' · '+o.tecnico:''}</div></div>`).join('');
  dd.style.display='block';
}

function selectOS(pre,id){
  const o=orders.find(x=>x.id===id);if(!o)return;
  selectedOS[pre]=o;
  const sw=$(`${pre}-os-search-wrap`),sb2=$(`${pre}-os-selected`);
  if(sw)sw.style.display='none';
  if(sb2){sb2.style.display='flex';sb2.innerHTML=`<div><div class="os-sel-info">OS ${o.num_os} — ${tipoLabel[o.tipo]||o.tipo}</div><div class="os-sel-meta">${fmtDateOnly(o.os_date)} · ${eqLabel(o.team)}${o.tecnico&&o.tecnico!=='—'?' · '+o.tecnico:''}</div></div><button class="btn-clear" onclick="clearOS('${pre}')">✕</button>`}
  $(`${pre}-os-dropdown`)&&($(`${pre}-os-dropdown`).style.display='none');
  if($(`${pre}-os`))$(`${pre}-os`).value=o.num_os;
  if($(`${pre}-tec`)&&o.tecnico&&o.tecnico!=='—')$(`${pre}-tec`).value=o.tecnico;
  const eq=$(`${pre}-equipe`);if(eq&&o.team)eq.value=o.team;
}

function clearOS(pre){
  selectedOS[pre]=null;
  const sw=$(`${pre}-os-search-wrap`),sb2=$(`${pre}-os-selected`);
  if(sw)sw.style.display='block';if(sb2)sb2.style.display='none';
  [$(`${pre}-os-search`),$(`${pre}-os`),$(`${pre}-tec`)].forEach(el=>{if(el)el.value=''});
  const eq=$(`${pre}-equipe`);if(eq)eq.value='';
}

document.addEventListener('click',e=>{
  if(!e.target.closest('.os-picker'))document.querySelectorAll('.os-dropdown').forEach(d=>d.style.display='none');
});

function checkEstoque(){
  const id=$('sai-produto')?.value;const p=produtos.find(x=>x.id===id);const al=$('sai-alerta');if(!al)return;
  if(p&&p.estoque_atual<=0){al.className='alert danger';al.style.display='block';al.textContent='⚠ Produto zerado no estoque!'}
  else if(p&&p.estoque_atual<=p.estoque_minimo){al.className='alert warning';al.style.display='block';al.textContent=`⚠ Estoque baixo: apenas ${p.estoque_atual} ${p.unidade} restantes.`}
  else al.style.display='none';
}

function checkVeiculoEstoque(){
  const id=$('vei-produto')?.value;const p=produtos.find(x=>x.id===id);const al=$('vei-alerta');if(!al)return;
  if(p&&p.estoque_atual<=0){al.className='alert danger';al.style.display='block';al.textContent='Produto zerado no estoque.'}
  else if(p&&p.estoque_atual<=p.estoque_minimo){al.className='alert warning';al.style.display='block';al.textContent=`Estoque baixo: ${p.estoque_atual} ${p.unidade}.`}
  else al.style.display='none';
}

async function salvarVeiculo(){
  const acao=$('vei-acao')?.value||'lancar';
  const produto_id=$('vei-produto')?.value;
  const quantidade=parseFloat($('vei-qtd')?.value);
  if(!produto_id){toast('Selecione um produto','err');return}
  if(!quantidade||quantidade<=0){toast('Informe uma quantidade válida','err');return}
  const tipo=acao==='devolver'?'entrada':'saida';
  const motivo=acao==='devolver'?'Devolução de técnico':acao==='baixar'?'Baixa em veículo / OS':'Lançamento para veículo';
  if(tipo==='saida'){
    const prod=produtos.find(p=>p.id===produto_id);
    if(prod&&prod.estoque_atual<quantidade){
      const al=$('vei-alerta');if(al){al.className='alert danger';al.style.display='block';al.textContent=`Estoque insuficiente. Disponível: ${prod.estoque_atual} ${prod.unidade}.`}
      return;
    }
  }
  const data={produto_id,tipo,quantidade,motivo,os_numero:$('vei-os')?.value||null,tecnico:$('vei-tec')?.value||null,equipe:$('vei-equipe')?.value||null,observacao:$('vei-obs')?.value||null};
  const{error}=await sb.from('estoque_movimentacoes').insert([data]);
  if(error){toast('Erro: '+error.message,'err');return}
  toast('Lançamento salvo','ok');
  clearOS('vei');
  ['vei-produto','vei-qtd','vei-obs'].forEach(id=>{const el=$(id);if(el)el.value=''});
  const al=$('vei-alerta');if(al)al.style.display='none';
  await loadAll();
  showPage('page-veiculo');
}

async function salvarMovimento(tipo){
  const pre=tipo==='entrada'?'ent':'sai';
  const produto_id=$(`${pre}-produto`)?.value;
  const quantidade=parseFloat($(`${pre}-qtd`)?.value);
  if(!produto_id){toast('Selecione um produto','err');return}
  if(!quantidade||quantidade<=0){toast('Informe uma quantidade válida','err');return}
  if(tipo==='saida'){
    const prod=produtos.find(p=>p.id===produto_id);
    if(prod&&prod.estoque_atual<quantidade){
      const al=$('sai-alerta');if(al){al.className='alert danger';al.style.display='block';al.textContent=`Estoque insuficiente! Disponível: ${prod.estoque_atual} ${prod.unidade}.`}return;
    }
    const al=$('sai-alerta');if(al)al.style.display='none';
  }
  const foto_url=await uploadFoto(pre,'movimentacao-fotos');
  const data={produto_id,tipo,quantidade,motivo:$(`${pre}-motivo`)?.value||null,os_numero:$(`${pre}-os`)?.value||null,tecnico:$(`${pre}-tec`)?.value||null,equipe:$(`${pre}-equipe`)?.value||null,observacao:$(`${pre}-obs`)?.value||null,foto_url};
  const{error}=await sb.from('estoque_movimentacoes').insert([data]);
  if(error){toast('Erro: '+error.message,'err');return}
  toast(tipo==='entrada'?'✓ Entrada registrada!':'✓ Saída registrada!','ok');
  clearOS(pre);$(`${pre}-produto`)&&($(`${pre}-produto`).value='');$(`${pre}-qtd`)&&($(`${pre}-qtd`).value='');$(`${pre}-obs`)&&($(`${pre}-obs`).value='');
  const fi=$(pre+'-foto-input');if(fi)fi.value='';
  const fp=$(pre+'-foto-preview');if(fp){fp.src='';fp.classList.remove('show')};
  await loadAll();
}

async function cadastrarProduto(){
  const nome=$('cad-nome')?.value.trim();if(!nome){toast('Nome é obrigatório','err');return}
  const estoque_inicial=parseFloat($('cad-estoq')?.value)||0;
  const foto_url=await uploadFoto('cad','produto-fotos');
  const data={nome,codigo:$('cad-cod')?.value||null,categoria_id:$('cad-cat')?.value||null,unidade:$('cad-unid')?.value||'un',estoque_atual:estoque_inicial,estoque_minimo:parseFloat($('cad-min')?.value)||0,descricao:$('cad-desc')?.value||null,foto_url};
  const{data:ins,error}=await sb.from('estoque_produtos').insert([data]).select('id').single();
  if(error){toast('Erro: '+error.message,'err');return}
  if(estoque_inicial>0&&ins)await sb.from('estoque_movimentacoes').insert([{produto_id:ins.id,tipo:'entrada',quantidade:estoque_inicial,motivo:'Estoque inicial'}]);
  toast('✓ Produto cadastrado!','ok');
  ['cad-nome','cad-cod','cad-desc'].forEach(id=>{const el=$(id);if(el)el.value=''});
  $('cad-estoq')&&($('cad-estoq').value='0');$('cad-min')&&($('cad-min').value='0');
  const fi=$('cad-foto-input');if(fi)fi.value='';
  const fp=$('cad-foto-preview');if(fp){fp.src='';fp.classList.remove('show')};
  await loadAll();
}

function renderCatList(){
  const el=$('cat-list');if(!el)return;
  el.innerHTML=!categorias.length?'<div style="text-align:center;color:var(--c-text3);padding:32px;font-family:var(--font-mono);font-size:12px">Nenhuma categoria</div>':categorias.map(c=>`<div class="cat-item"><span style="font-weight:500;font-size:13px">${c.nome}</span><span class="cat-count">${produtos.filter(p=>p.categoria_id===c.id).length} produtos</span></div>`).join('');
}

function confirmarLimparEstoque(){
  const overlay=$('modal-overlay');const box=$('modal-box');
  overlay.style.display='flex';
  setTimeout(()=>{box.style.transform='scale(1)';box.style.opacity='1'},10);
}
function fecharModal(){
  const overlay=$('modal-overlay');const box=$('modal-box');
  box.style.transform='scale(.95)';box.style.opacity='0';
  setTimeout(()=>overlay.style.display='none',200);
}
async function executarZerarEstoque(){
  fecharModal();
  const{error:e1}=await sb.from('estoque_movimentacoes').delete().neq('id','00000000-0000-0000-0000-000000000000');
  const{error:e2}=await sb.from('estoque_produtos').update({estoque_atual:0}).neq('id','00000000-0000-0000-0000-000000000000');
  if(e1||e2){toast('Erro ao zerar estoque','err');return}
  toast('Estoque zerado com sucesso','ok');
  await loadAll();
}


function renderGaleria(){
  // Produtos com foto
  const gprod=document.getElementById('gallery-produtos-grid');
  if(gprod){
    const lista=produtos.filter(p=>p.foto_url);
    if(!lista.length){gprod.innerHTML='<div class="gallery-empty"><i class="ti ti-photo-off" style="font-size:40px;display:block;margin-bottom:12px"></i>Nenhum produto com foto cadastrada</div>';}
    else gprod.innerHTML=lista.map(p=>`
      <div class="gallery-card" onclick="abrirFoto('${p.foto_url}')">
        <img src="${p.foto_url}" alt="${p.nome}" loading="lazy">
        <div class="gallery-card-info">
          <div class="gallery-card-name">${p.nome}</div>
          <div class="gallery-card-meta">${p.estoque_categorias?.nome||'—'} · ${p.estoque_atual} ${p.unidade}</div>
        </div>
      </div>`).join('');
  }
  // Movimentações com foto
  const gmov=document.getElementById('gallery-mov-grid');
  if(gmov){
    const tipo=document.getElementById('gal-fil-tipo')?.value||'';
    const lista=movimentacoes.filter(m=>m.foto_url&&(!tipo||m.tipo===tipo));
    if(!lista.length){gmov.innerHTML='<div class="gallery-empty"><i class="ti ti-photo-off" style="font-size:40px;display:block;margin-bottom:12px"></i>Nenhuma movimentação com foto</div>';}
    else gmov.innerHTML=lista.map(m=>`
      <div class="gallery-card" onclick="abrirFoto('${m.foto_url}')">
        <img src="${m.foto_url}" alt="${m.estoque_produtos?.nome||''}" loading="lazy">
        <div class="gallery-card-info">
          <div class="gallery-card-name">${m.estoque_produtos?.nome||'—'}</div>
          <div class="gallery-card-meta"><span class="badge ${m.tipo}" style="font-size:10px">${m.tipo}</span> ${m.os_numero?'· OS #'+m.os_numero:''} · ${fmtDate(m.created_at)}</div>
        </div>
      </div>`).join('');
  }
}

function previewFoto(pre){
  const input=$(pre+'-foto-input');
  const preview=$(pre+'-foto-preview');
  if(!input||!input.files[0])return;
  const reader=new FileReader();
  reader.onload=e=>{preview.src=e.target.result;preview.classList.add('show')};
  reader.readAsDataURL(input.files[0]);
}

async function uploadFoto(pre,bucket){
  const input=$(pre+'-foto-input');
  if(!input||!input.files[0])return null;
  const file=input.files[0];
  const ext=file.name.split('.').pop();
  const path=`${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const{error}=await sb.storage.from(bucket).upload(path,file,{cacheControl:'3600',upsert:false});
  if(error){console.error(error);return null}
  return sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

function abrirFoto(url){
  const lb=$('lightbox');
  lb.querySelector('img').src=url;
  lb.classList.add('show');
}

document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('lightbox').addEventListener('click',()=>document.getElementById('lightbox').classList.remove('show'));
  document.querySelectorAll('.nav-item[data-page]').forEach(item=>item.addEventListener('click',()=>showPage(item.dataset.page)));
  document.querySelectorAll('.menu-link[data-page]').forEach(item=>item.addEventListener('click',()=>{
    showPage(item.dataset.page);
    if(item.dataset.tab)showTab(item.dataset.tab);
    if(document.activeElement)document.activeElement.blur();
  }));
  document.querySelectorAll('.tab[data-tab]').forEach(tab=>tab.addEventListener('click',()=>showTab(tab.dataset.tab)));
  loadAll();
});
