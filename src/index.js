const express = require('express');
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function onlyDigits(str = '') {
  return String(str).replace(/\D+/g, '');
}

function nameFormatted(nome = '') {
  return String(nome).trim().toUpperCase();
}

function cpfFormatted(cpf = '') {
  const digits = onlyDigits(cpf);
  if (digits.length !== 11) {
    throw new Error('CPF inválido. Informe exatamente 11 dígitos (com ou sem máscara).');
  }
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function cellFormatted(cel = '') {
  const digits = onlyDigits(cel);
  if (digits.length !== 11) {
    throw new Error('Telefone inválido. O número deve conter exatamente 11 dígitos no formato (00) 00000-0000.');
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function dateFormatted(d = '') {
  if (!d) return d;
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  const s = String(d);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split('/');
    return `${yyyy}-${mm}-${dd}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return s;
}

const employees = [];
const classes = [];
let nextClassId = 1;

(function seed() {
  const turmasSeed = [
    { codigo: 'T-01', nome: 'Desenvolvimento I',  turno: 'Manhã' },
    { codigo: 'T-02', nome: 'Desenvolvimento II', turno: 'Tarde' },
    { codigo: 'T-03', nome: 'Banco de Dados', turno: 'Noite' },
    { codigo: 'T-04', nome: 'Artes Visuais', turno: 'Noite' },
    { codigo: 'T-05', nome: 'Anatomia', turno: 'Manhã' },
  ];
  turmasSeed.forEach(t => {
    classes.push({
      id: nextClassId++,
      codigo: String(t.codigo),
      nome: String(t.nome),
      turno: t.turno || undefined,
    });
  });

  const instrutoresSeed = [
    {
      registro: 'P001',
      nome: 'Patrick Estevão de Oliveira',
      cpf:  '12345678901',
      email: 'patrick@gmail.com',
      dataNascimento: '1990-03-10',
      telefone: '41999990000',
    },
    {
      registro: 'H002',
      nome: 'Henrique Bianor Freitas Silva',
      cpf:  '23456789012',
      email: 'henrique@gmail.com',
      dataNascimento: '1988-07-22',
      telefone: '11988887777',
    },
    {
      registro: 'A003',
      nome: 'Anderson Cordeiro Cardoso',
      cpf:  '34567890123',
      email: 'anderson@gmail.com',
      dataNascimento: '1992-11-05',
      telefone: '31977776666',
    },
  ];

  instrutoresSeed.forEach((i) => {
    employees.push({
      registro: String(i.registro),
      nome: nameFormatted(i.nome),
      cpf: cpfFormatted(i.cpf),                     
      email: i.email || undefined,
      dataNascimento: dateFormatted(i.dataNascimento),
      telefone: cellFormatted(i.telefone),          
      turmas: [],                                   
    });
  });

  const patrick = employees.find(e => e.registro === 'P001');
  patrick?.turmas.push(1, 3);

  const henrique = employees.find(e => e.registro === 'H002');
  henrique?.turmas.push(2);

})();

function getInstructorsByClassId(classId) {
  return employees
    .filter(e => e.turmas.includes(Number(classId)))
    .map(e => ({ registro: e.registro, nome: e.nome }));
}

function getInstructorNamesByClassId(classId) {
  return employees
    .filter(e => e.turmas.includes(Number(classId)))
    .map(e => e.nome);
}

function verifyIfEmployeeAlreadyExists(req, res, next) {
  const { registro, cpf } = req.body || {};
  const reg = String(registro);
  const cpfDigits = onlyDigits(cpf);
  const sameRegistro = employees.some(e => e.registro === reg);
  if (sameRegistro) {
    return res.status(400).json({
      erro: 'Instrutor já existente: este registro já foi cadastrado.'
    });
  }

  const sameCpf = employees.some(e => onlyDigits(e.cpf) === cpfDigits);
  if (sameCpf) {
    return res.status(400).json({
      erro: 'Instrutor já existente: este CPF já foi cadastrado.'
    });
  }

  next();
}

function verifyIfClassAlreadyExists(req, res, next) {
  const { codigo } = req.body || {};
  const exists = classes.find((c) => c.codigo === String(codigo));
  if (exists) return res.status(400).json({ erro: 'Turma já existente (código).' });
  next();
}

function verifyIfEmployeeExists(req, res, next) {
  const { registro } = req.params;
  const emp = employees.find((e) => e.registro === String(registro));
  if (!emp) return res.status(404).json({ erro: 'Instrutor não encontrado.' });
  req.employee = emp;
  next();
}

function verifyIfClassExists(req, res, next) {
  const { id } = req.params;
  const cls = classes.find((c) => c.id === Number(id));
  if (!cls) return res.status(404).json({ erro: 'Turma não encontrada.' });
  req.classObj = cls;
  next();
}

function verifyIfClassAlreadyLinkedEmployee(req, res, next) {
  const emp = req.employee;
  const cls = req.classObj;
  if (emp.turmas.includes(cls.id)) {
    return res.status(400).json({ erro: 'Turma já vinculada ao instrutor.' });
  }
  next();
}

function verifyClassLinkedEmployee(req, res, next) {
  const { id } = req.params;
  const linked = employees.some((e) => e.turmas.includes(Number(id)));
  if (linked) {
    return res.status(400).json({
      erro: 'Não é possível excluir a turma: ela está vinculada a algum instrutor.'
    });
  }
  next();
}

function verifyLogin(req, res, next) {
  const token = req.header('x-auth');
  if (token !== 'admin') return res.status(401).json({ erro: 'Não autorizado.' });
  next();
}

app.post('/instrutores', verifyIfEmployeeAlreadyExists, (req, res) => {
  const { registro, nome, cpf, email, dataNascimento, telefone } = req.body || {};
  if (!registro || !nome || !cpf) {
    return res.status(400).json({ erro: 'registro, nome e cpf são obrigatórios.' });
  }

let cpfFormatado;
  try {
    cpfFormatado = cpfFormatted(cpf); 
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }

  let telefoneFormatado;
  if (telefone !== undefined && telefone !== null && telefone !== '') {
    try {
      telefoneFormatado = cellFormatted(telefone); 
    } catch (err) {
      return res.status(400).json({ erro: err.message });
    }
  }

  const novo = {
    registro: String(registro),
    nome: nameFormatted(nome),
    cpf: cpfFormatted(cpf),
    email: email || undefined,
    dataNascimento: dateFormatted(dataNascimento),
    telefone: telefone ? cellFormatted(telefone) : undefined,
    turmas: []
  };
  employees.push(novo);
  return res.status(201).json(novo);
});

app.post('/instrutores/update', (req, res) => {
  const { registro, nome, email, dataNascimento, telefone } = req.body || {};
  if (!registro) return res.status(400).json({ erro: 'Informe o registro do instrutor.' });

  const emp = employees.find(e => e.registro === String(registro));
  if (!emp) return res.status(404).json({ erro: 'Instrutor não encontrado.' });

  const erros = [];
  if (telefone !== undefined && telefone !== '') {
    try { emp.telefone = cellFormatted(telefone); } catch (err) { erros.push(err.message); }
  }
  if (erros.length) return res.status(400).json({ erros });

  if (nome) emp.nome = nameFormatted(nome);
  if (email !== undefined) emp.email = email;
  if (dataNascimento) emp.dataNascimento = dateFormatted(dataNascimento);

  return res.json(emp);
});

app.post('/instrutores/delete', (req, res) => {
  const { registro } = req.body || {};
  if (!registro) return res.status(400).json({ erro: 'Informe o registro.' });

  const idx = employees.findIndex(e => e.registro === String(registro));
  if (idx === -1) return res.status(404).json({ erro: 'Instrutor não encontrado.' });

  employees.splice(idx, 1);
  return res.json({ mensagem: 'Instrutor excluído com sucesso.' });
});

app.post('/instrutores/vincular', (req, res) => {
  const { registro, idTurma } = req.body || {};
  if (!registro || !idTurma) {
    return res.status(400).json({ erro: 'Informe registro do instrutor e ID da turma.' });
  }

  const emp = employees.find(e => e.registro === String(registro));
  if (!emp) return res.status(404).json({ erro: 'Instrutor não encontrado.' });

  const turma = classes.find(c => c.id === Number(idTurma));
  if (!turma) return res.status(404).json({ erro: 'Turma não encontrada.' });

  if (emp.turmas.includes(turma.id)) {
    return res.status(400).json({ erro: 'Turma já vinculada ao instrutor.' });
  }

  emp.turmas.push(turma.id);
  return res.json({ mensagem: 'Vinculado com sucesso.', instrutor: emp });
});

app.post('/turmas', verifyIfClassAlreadyExists, (req, res) => {
  const { codigo, nome, turno } = req.body || {};
  if (!codigo || !nome) return res.status(400).json({ erro: 'codigo e nome são obrigatórios.' });
  const nova = { id: nextClassId++, codigo: String(codigo), nome: String(nome), turno: turno || undefined };
  classes.push(nova);
  return res.status(201).json(nova);
});

app.put(
  '/instrutores/:registro/turmas/:id',
  verifyIfEmployeeExists,
  verifyIfClassExists,
  verifyIfClassAlreadyLinkedEmployee,
  (req, res) => {
    req.employee.turmas.push(req.classObj.id);
    return res.status(200).json({ mensagem: 'Vinculado com sucesso.', instrutor: req.employee });
  }
);

app.post('/turmas/delete', (req, res) => {
  const { id, token } = req.body || {};
  if (!id) return res.status(400).json({ erro: 'Informe o ID da turma.' });
  if (token !== 'admin') return res.status(401).json({ erro: 'Não autorizado. Token inválido.' });

  const idNum = Number(id);
  const clsIdx = classes.findIndex(c => c.id === idNum);
  if (clsIdx === -1) return res.status(404).json({ erro: 'Turma não encontrada.' });

  const vinculada = employees.some(e => e.turmas.includes(idNum));
  if (vinculada) return res.status(400).json({ erro: 'Turma está vinculada a algum instrutor.' });

  classes.splice(clsIdx, 1);
  employees.forEach(e => { e.turmas = e.turmas.filter(tid => tid !== idNum); });

  return res.json({ mensagem: 'Turma excluída com sucesso.' });
});

app.get('/instrutores', (req, res) => {
  const { nome, registro, cpf, hasTurmas, turmaId } = req.query;

  let list = employees;

  if (nome) {
    const q = String(nome).toUpperCase().trim();
    list = list.filter((i) => String(i.nome || '').toUpperCase().includes(q));
  }

  if (registro) {
    const reg = String(registro).toUpperCase().trim();
    list = list.filter((i) => String(i.registro || '').toUpperCase() === reg);
  }

  if (cpf) {
    const cpfDigits = onlyDigits(cpf);
    list = list.filter((i) => onlyDigits(i.cpf) === cpfDigits);
  }

  if (hasTurmas !== undefined) {
    const want = String(hasTurmas).toLowerCase() === 'true';
    list = list.filter((i) => (want ? i.turmas.length > 0 : i.turmas.length === 0));
  }

  if (turmaId !== undefined) {
    const idNum = Number(turmaId);
    list = list.filter((i) => i.turmas.includes(idNum));
  }

  const expanded = list.map((inst) => {
    const turmasDetalhadas = inst.turmas
      .map((id) => {
        const t = classes.find((c) => c.id === id);
        return t ? { id: t.id, nome: t.nome, codigo: t.codigo, turno: t.turno } : null;
      })
      .filter(Boolean); 

    return {
      ...inst,
      turmas: turmasDetalhadas,
    };
  });

  return res.json({ instrutores: expanded });
});

app.get('/instrutores/registro/:registro', (req, res) => {
  const { registro } = req.params;
  const emp = employees.find((e) => e.registro === String(registro));
  if (!emp) return res.status(404).json({ erro: 'Instrutor não encontrado.' });
  return res.json(emp);
});

app.get('/instrutores/cpf/:cpf', (req, res) => {
  const cpfDigits = onlyDigits(req.params.cpf);
  const emp = employees.find((e) => onlyDigits(e.cpf) === cpfDigits);
  if (!emp) return res.status(404).json({ erro: 'Instrutor não encontrado.' });
  return res.json(emp);
});

app.get('/instrutores/nome', (req, res) => {
  const q = String(req.query.q || '').trim().toUpperCase();
  if (!q) return res.status(400).json({ erro: 'Use ?q= para buscar por nome.' });

  const list = employees.filter((e) => e.nome.includes(q));

  if (list.length === 0) {
    return res.status(404).json({ erro: 'Instrutor não encontrado pelo nome informado.' });
  }

  return res.json(list);
});

app.get('/turmas', (req, res) => {
  const { turno, codigo, nomes } = req.query;

  let list = classes;

  if (turno) {
    list = list.filter(t =>
      String(t.turno || '').toUpperCase() === String(turno).toUpperCase()
    );
  }

  if (codigo) {
    list = list.filter(t =>
      String(t.codigo).toUpperCase() === String(codigo).toUpperCase()
    );
  }

  const enriched = list.map(turma => ({
    ...turma,
    instrutores: nomes === 'true'
      ? getInstructorNamesByClassId(turma.id)  
      : getInstructorsByClassId(turma.id)      
  }));

  return res.json({ turmas: enriched });
});

app.get('/instrutores/:registro/turmas', verifyIfEmployeeExists, (req, res) => {
  const { detalhes } = req.query;
  const ids = req.employee.turmas;

  if (String(detalhes).toLowerCase() === 'false') {
    return res.json(ids);
  }

  const result = ids
    .map(id => classes.find(c => c.id === id))
    .filter(Boolean);

  return res.json(result);
});

app.get('/turmas/:id', verifyLogin, verifyIfClassExists, (req, res) => {
  const { nomes } = req.query;
  const turma = req.classObj;

  const instrutores = nomes === 'true'
    ? getInstructorNamesByClassId(turma.id)
    : getInstructorsByClassId(turma.id);

  return res.json({ ...turma, instrutores });
});

app.patch('/instrutores/:registro', verifyIfEmployeeExists, (req, res) => {
  const { nome, email, dataNascimento, telefone, registro: novoRegistro, cpf: novoCpf, turmas } = req.body || {};

  const erros = [];

  if (novoRegistro && novoRegistro !== req.employee.registro) {
    erros.push('Não é permitido alterar o ID (registro).');
  }

  if (novoCpf && onlyDigits(novoCpf) !== onlyDigits(req.employee.cpf)) {
    erros.push('Não é permitido alterar o CPF.');
  }

  if (turmas !== undefined) {
    erros.push('Não é permitido alterar as turmas do instrutor.');
  }

if (telefone !== undefined) {
  try {
    req.employee.telefone = cellFormatted(telefone);
  } catch (err) {
    erros.push(err.message);
  }
}

  if (erros.length > 0) {
    return res.status(400).json({ erros });
  }

  if (nome) req.employee.nome = nameFormatted(nome);
  if (email !== undefined) req.employee.email = email;
  if (dataNascimento) req.employee.dataNascimento = dateFormatted(dataNascimento);
  if (telefone) req.employee.telefone = cellFormatted(telefone);

  return res.json(req.employee);
});

app.delete('/instrutores/:registro', verifyIfEmployeeExists, (req, res) => {
  const { registro } = req.params;

  const index = employees.findIndex(e => e.registro === registro);
  if (index === -1) {
    return res.status(404).json({ erro: 'Instrutor não encontrado.' });
  }

  employees.splice(index, 1);

  return res.status(200).json({ mensagem: 'Instrutor excluído com sucesso.' });
});

app.delete('/turmas/:id', verifyLogin, verifyIfClassExists, verifyClassLinkedEmployee, (req, res) => {
  const id = req.classObj.id;

  const idx = classes.findIndex(c => c.id === id);
  if (idx === -1) {
    return res.status(404).json({ erro: 'Turma não encontrada.' });
  }

  classes.splice(idx, 1);

  employees.forEach(e => {
    e.turmas = e.turmas.filter(tid => tid !== id);
  });

  return res.status(200).json({ mensagem: 'Turma excluída com sucesso.' });
});

app.use(express.static('public'));

app.get('/', (req, res) => { 
  res.send(`
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="UTF-8">
    <title>API Instrutores & Turmas</title>
    <link rel="icon" type="image/png" href="/I e T.png">
    <style>
      body { 
        font-family: Arial, sans-serif; 
        margin: 0; 
        padding: 0; 
        background: #f4f4f4;
      }
      header { background: #333; color: #fff; padding: 20px; text-align: center; }
      h1 { margin: 0; }
      nav { background: #444; padding: 10px; }
      nav a { color: #fff; margin: 0 10px; text-decoration: none; }
      nav a:hover { text-decoration: underline; }
      section { padding: 20px; background: rgba(255,255,255,0.9); margin: 20px; border-radius: 8px; }
      h2 { color: #333; margin-top: 40px; }
      form { background: #fff; padding: 20px; margin-top: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
      form input, form select { padding: 8px; margin: 5px 0; width: 100%; }
      form button { padding: 10px; background: #007BFF; border: none; color: white; border-radius: 5px; cursor: pointer; }
      form button:hover { background: #0056b3; }
      .json-link { display: block; margin: 5px 0; }

      .dg-wrap { 
        display: grid; 
        grid-template-columns: repeat(3, minmax(260px, 1fr)); 
        gap: 16px; 
        align-items: start;
      }
      /* opcional: em telas bem estreitas, deixe 2 colunas */
      @media (max-width: 820px) { 
        .dg-wrap { grid-template-columns: repeat(2, minmax(220px, 1fr)); }
      }
      /* e em celulares, 1 coluna */
      @media (max-width: 520px) { 
        .dg-wrap { grid-template-columns: 1fr; }
      }

      .card { background:#fff; border-radius:10px; box-shadow:0 2px 8px rgba(0,0,0,.1); padding:14px; }
      .card h3 { margin: 6px 0 12px; display:flex; align-items:center; gap:8px; }
      .toolbar { display:flex; justify-content:flex-end; gap:10px; margin-bottom:10px; flex-wrap: wrap; }
      .btn { padding:8px 10px; border:0; border-radius:6px; cursor:pointer; }
      .btn.refresh { background:#0d6efd; color:#fff; }
      .btn.copy { background:#6c757d; color:#fff; }

      table { width:100%; border-collapse:collapse; font-size:14px; }
      thead th { background:#f2f2f2; text-align:left; padding:8px; position:sticky; top:0; z-index:1; }
      tbody td { border-top:1px solid #eee; padding:8px; vertical-align:top; }
      .muted { color: #666; font-size: 14px; }
      ul.links { list-style: none; padding-left: 0; }
      ul.links li { margin: 6px 0; }
      ul.links li a { color: #007BFF; text-decoration: none; display:inline-flex; align-items:center; gap:8px; }
      ul.links li a:hover { text-decoration: underline; }
      ul.links li img { width:22px; height:22px; display:inline-block; }

      footer { 
        background: #333; 
        color: #fff; 
        padding: 20px; 
        margin-top: 40px; 
        display: flex; 
        align-items: center; 
        justify-content: space-between; 
      }
      .footer-left { display:flex; align-items:center; gap:10px; }

      #toast {
        position: fixed; right: 20px; bottom: 20px;
        max-width: 420px; padding: 14px 16px; border-radius: 8px;
        color: #fff; background: #28a745; box-shadow: 0 6px 18px rgba(0,0,0,.2);
        opacity: 0; transform: translateY(10px); pointer-events: none;
        transition: all .25s ease; z-index: 9999;
      }
      #toast.show { opacity: 1; transform: translateY(0); pointer-events: auto; }
    </style>
  </head>
  <body>
    <header>
      <h1 style="display:flex;align-items:center;justify-content:center;gap:10px;">
        <img src="/logo i e t.png" alt="Logo Instrutores & Turmas" style="width:34px;height:34px;">
        API - Instrutores & Turmas
      </h1>
      <p>Interface de simulação (GET, POST, PUT, DELETE)</p>
    </header>

    <nav>
      <a href="#visao">Visão Geral</a>
      <a href="#listar">Listar</a>
      <a href="#filtrar">Filtros</a>
      <a href="#criar">Criar</a>
      <a href="#atualizar">Atualizar</a>
      <a href="#excluir">Excluir</a>
      <a href="#vinculo">Vínculos</a>
      <a href="#creditos">Créditos</a>
    </nav>

    <section id="visao">
      <h2>📊 Visão Geral</h2>
      <div class="toolbar">
        <button class="btn refresh" id="btnReload">Recarregar</button>
        <button class="btn copy" id="btnCopy">Copiar JSON (instrutores + turmas)</button>
      </div>

      <div class="dg-wrap">
        <!-- 1) Instrutores -->
        <div class="card">
          <h3>👨‍🏫 Instrutores</h3>
          <div style="max-height:360px; overflow:auto;">
            <table id="dgInstrutores">
              <thead>
                <tr>
                  <th>Registro</th>
                  <th>Nome</th>
                  <th>CPF</th>
                  <th>Email</th>
                  <th>Telefone</th>
                  <th>Turmas</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <h3>🏫 Turmas</h3>
          <div style="max-height:360px; overflow:auto;">
            <table id="dgTurmas">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Código</th>
                  <th>Nome</th>
                  <th>Turno</th>
                  <th>Instrutores</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <h3>🔗 Vínculo Instrutor ↔ Turma</h3>
          <div style="max-height:360px; overflow:auto;">
            <table id="dgVinculos">
              <thead>
                <tr>
                  <th>Registro</th>
                  <th>Instrutor</th>
                  <th>Turma (ID)</th>
                  <th>Código</th>
                  <th>Nome da Turma</th>
                  <th>Turno</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
    
    <section id="listar">
      <h2>📘 Listagem Rápida</h2>
      <a class="json-link" href="/instrutores" target="_blank">➡️ Ver todos instrutores</a>
      <a class="json-link" href="/turmas" target="_blank">➡️ Ver todas turmas</a>
      <a class="json-link" href="/instrutores/P001/turmas" target="_blank">➡️ Turmas do instrutor P001</a>
      <p class="muted">Dica: você também pode filtrar em <code>/instrutores?nome=patrick</code> ou <code>/turmas?turno=Noite</code>.</p>
    </section>

    <section id="filtrar">
      <h2>🔎 Filtros em Turmas</h2>
      <a class="json-link" href="/turmas?turno=Noite" target="_blank">➡️ Turmas no turno Noite</a>
      <a class="json-link" href="/turmas?codigo=T-01" target="_blank">➡️ Turma com código T-01</a>
    </section>

    <section id="criar">
      <h2>📝 Criar Recursos</h2>
      <form method="POST" action="/instrutores">
        <h3>Novo Instrutor</h3>
        <input type="text" name="registro" placeholder="Registro" required>
        <input type="text" name="nome" placeholder="Nome" required>
        <input type="text" name="cpf" placeholder="CPF (com ou sem máscara)" required>
        <input type="email" name="email" placeholder="Email">
        <input type="text" name="dataNascimento" placeholder="Data Nascimento (YYYY-MM-DD)">
        <input type="text" name="telefone" placeholder="Telefone (11 dígitos ou (00) 00000-0000)">
        <button type="submit">Criar Instrutor</button>
      </form>

      <form method="POST" action="/turmas">
        <h3>Nova Turma</h3>
        <input type="text" name="codigo" placeholder="Código" required>
        <input type="text" name="nome" placeholder="Nome da Turma" required>
        <input type="text" name="turno" placeholder="Turno (Manhã/Tarde/Noite)">
        <button type="submit">Criar Turma</button>
      </form>
    </section>

    <section id="atualizar">
      <h2>✏️ Atualizar Dados</h2>
      <form method="POST" action="/instrutores/update">
        <h3>Atualizar Instrutor</h3>
        <input type="text" name="registro" placeholder="Registro do instrutor" required>
        <input type="text" name="nome" placeholder="Novo Nome">
        <input type="email" name="email" placeholder="Novo Email">
        <input type="text" name="dataNascimento" placeholder="YYYY-MM-DD">
        <input type="text" name="telefone" placeholder="Novo Telefone (11 dígitos)">
        <button type="submit">Atualizar</button>
      </form>
      <p class="muted">Obs: não é permitido alterar CPF ou registro.</p>
    </section>

    <section id="excluir">
      <h2>🗑️ Excluir</h2>
      <form method="POST" action="/instrutores/delete">
        <h3>Excluir Instrutor</h3>
        <input type="text" name="registro" placeholder="Registro do instrutor" required>
        <button type="submit">Excluir</button>
      </form>

      <form method="POST" action="/turmas/delete">
        <h3>Excluir Turma</h3>
        <input type="number" name="id" placeholder="ID da turma" required>
        <input type="text" name="token" placeholder="x-auth (digite: admin)" required>
        <button type="submit">Excluir</button>
      </form>
    </section>

    <section id="vinculo">
      <h2>🔗 Vínculo Instrutor ↔️ Turma</h2>
      <form method="POST" action="/instrutores/vincular">
        <input type="text" name="registro" placeholder="Registro do instrutor" required>
        <input type="number" name="idTurma" placeholder="ID da turma" required>
        <button type="submit">Vincular</button>
      </form>
    </section>

    <section id="creditos" style="margin-top:40px;">
  <h2>📌 Créditos & Desenvolvimento</h2>

  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px;margin-top:20px;">
<div class="card">
  <h3>🎓 Informações Acadêmicas</h3>
  <p>
    Este projeto foi desenvolvido como parte de um <strong>trabalho acadêmico</strong> no curso de 
    <strong>Sistemas de Informação – Universidade Vale do Rio Doce (Univale)</strong>, 
    na disciplina de <strong>Desenvolvimento Web</strong>.
  </p>

  <div style="text-align:center; margin-top:15px;">
    <img src="/Icons.png" alt="Sistemas de Informação Univale" style="max-width:100%; height:auto;">
  </div>
</div>

    <div class="card" style="text-align:center;">
      <h3>👨‍💻 Autor & Orientação</h3>
      <div style="display:flex;justify-content:center;gap:30px;align-items:center;flex-wrap:wrap;">
        <!-- Foto Vitor -->
        <div>
          <img src="/Vitor.png" alt="Aluno Vitor" style="width:120px;height:120px;border-radius:50%;object-fit:cover;">
          <p><strong>Aluno:</strong><br> Vitor Manoel Vidal Braz<br>(4º período)</p>
        </div>

        <div>
          <img src="/Patrick.png" alt="Professor Patrick" style="width:120px;height:120px;border-radius:50%;object-fit:cover;">
          <p><strong>Professor Orientador:</strong><br> Patrick Vinícius Estevão de Oliveira</p>
        </div>
      </div>
    </div>

<div class="card">
  <h3>⚙️ Tecnologia</h3>
  <p>
    Construído sobre a engine personalizada <strong>VM ENGINE DEVELOPMENT V:2.5</strong>, 
    com foco em boas práticas de programação, organização de código e simulação de funcionalidades 
    <code>REST (GET, POST, PUT, PATCH, DELETE)</code> em ambiente <strong>Node.js + Express</strong>.
  </p>
  <div style="text-align:center; margin-top:15px;">
    <img src="/Tecnologias.png" alt="Tecnologias Utilizadas" style="max-width:100%; height:auto; border-radius:10px;">
  </div>
</div>

<div class="card">
  <h3>💻 Sobre o Código</h3>
  <p>
    O sistema foi implementado com <strong>Node.js e Express</strong>, estruturado em 
    <code>index.js</code>, <code>package.json</code> e <code>package-lock.json</code>. 
    Ele suporta:
  </p>
  <ul>
    <li>Rotas RESTful organizadas: <code>GET</code>, <code>POST</code>, <code>PUT</code>, <code>DELETE</code>.</li>
    <li>Validações de dados para evitar inconsistências.</li>
    <li>Respostas com códigos HTTP adequados (<code>200</code>, <code>201</code>, <code>400</code>, <code>404</code>).</li>
    <li>Layout estilizado com HTML + CSS dentro da rota <code>/</code>.</li>
    <li>Seções de créditos, links e apresentação do projeto.</li>
  </ul>
  <p>
    O código foi escrito com clareza, mantendo boas práticas de desenvolvimento e 
    simulação de um ambiente real de API acadêmica.
  </p>

  <div style="text-align:center; margin-top:15px;">
    <img src="/Sobreocodigo.png" alt="Código JS" style="width:120px; height:auto;">
  </div>
</div>

    <div class="card">
      <h3>📖 Requisitos</h3>
      <ul>
        <li>Cadastro de instrutores com registro, nome, CPF, e-mail, telefone e nascimento.</li>
        <li>Cadastro de turmas com código, nome e turno.</li>
        <li>Vinculação de turmas a instrutores.</li>
        <li>Consultas por registro, CPF, nome ou código de turma.</li>
        <li>Atualizações de dados (nome, e-mail, telefone, nascimento).</li>
        <li>Exclusão de instrutores e turmas.</li>
      </ul>
    </div>

    <div class="card">
      <h3>⚖️ Regras de Negócio</h3>
      <ul>
        <li>Não cadastrar instrutor com mesmo registro.</li>
        <li>Não cadastrar turma com código duplicado.</li>
        <li>Não excluir turmas vinculadas a instrutores.</li>
        <li>Não vincular a mesma turma mais de uma vez ao mesmo instrutor.</li>
      </ul>
    </div>

    <div class="card">
      <h3>🛠️ Utils</h3>
      <ul>
        <li>Formatar nomes em MAIÚSCULAS.</li>
        <li>Formatar CPF no padrão <code>000.000.000-00</code>.</li>
        <li>Formatar telefone no padrão brasileiro <code>(00) 00000-0000</code>.</li>
        <li>Validar datas no padrão <code>YYYY-MM-DD</code>.</li>
      </ul>
    </div>

    <div class="card">
      <h3>🔗 Links</h3>
      <ul class="links">
        <li>
          <a href="https://linktr.ee/vitormanoelvb" target="_blank">
            <img src="/linktree.png" alt="Linktree"> Linktree do Desenvolvedor
          </a>
        </li>
        <li>
          <a href="https://github.com/vitormanoelvb/api-instrutor" target="_blank">
            <img src="/GitHub.png" alt="GitHub"> Repositório no GitHub
          </a>
        </li>
      </ul>
    </div>
  </div>
</section>

    <footer>
  <div class="footer-left">
    <img src="/vmsystems.png" alt="VM Systems Logo" style="height:56px;">
    <p style="margin:0;">
      API Simulação - Instrutores e Turmas © ${new Date().getFullYear()} - Powered by 
      <strong>VM Systems</strong>
    </p>
  </div>

  <span style="font-size:14px; color:#ccc;">
    Assinatura oficial: <strong>@vmengine2025</strong>
  </span>
</footer>

    <div id="toast"></div>

    <script>
      const toast = document.getElementById('toast');
      function showToast(msg, ok=true) {
        toast.textContent = msg;
        toast.style.background = ok ? '#28a745' : '#dc3545';
        toast.classList.add('show');
        clearTimeout(window.__tHide);
        window.__tHide = setTimeout(()=>toast.classList.remove('show'), 3200);
      }

      async function loadGrid() {
        try {
          const [ri, rt] = await Promise.all([
            fetch('/instrutores'),
            fetch('/turmas')
          ]);
          const dI = await ri.json(); // { instrutores: [...] }
          const dT = await rt.json(); // { turmas: [...] }

          renderInstrutores(dI.instrutores || []);
          renderTurmas(dT.turmas || []);
          renderVinculos(dI.instrutores || [], dT.turmas || []);
        } catch(e) {
          showToast('Falha ao carregar DataGrid.', false);
        }
      }

      function renderInstrutores(list) {
        const tb = document.querySelector('#dgInstrutores tbody');
        tb.innerHTML = '';
        list.forEach(i => {
          const turmas = (i.turmas || []).map(t => t.codigo + ' - ' + t.nome).join('<br>') || '<span class="muted">—</span>';
          tb.insertAdjacentHTML('beforeend', \`
            <tr>
              <td>\${i.registro}</td>
              <td>\${i.nome}</td>
              <td>\${i.cpf || ''}</td>
              <td>\${i.email || ''}</td>
              <td>\${i.telefone || ''}</td>
              <td>\${turmas}</td>
            </tr>\`);
        });
      }

      function renderTurmas(list) {
        const tb = document.querySelector('#dgTurmas tbody');
        tb.innerHTML = '';
        list.forEach(t => {
          const instrs = (t.instrutores || []).map(x => (x.nome || x.registro)).join('<br>') || '<span class="muted">—</span>';
          tb.insertAdjacentHTML('beforeend', \`
            <tr>
              <td>\${t.id}</td>
              <td>\${t.codigo}</td>
              <td>\${t.nome}</td>
              <td>\${t.turno || ''}</td>
              <td>\${instrs}</td>
            </tr>\`);
        });
      }

      function renderVinculos(instrutores, turmas) {
        const tb = document.querySelector('#dgVinculos tbody');
        tb.innerHTML = '';
        const mapTurma = new Map((turmas || []).map(t => [t.id, t]));
        instrutores.forEach(i => {
          (i.turmas || []).forEach(t => {
            const full = mapTurma.get(t.id) || t; // t já vem detalhado do /instrutores
            tb.insertAdjacentHTML('beforeend', \`
              <tr>
                <td>\${i.registro}</td>
                <td>\${i.nome}</td>
                <td>\${full.id ?? ''}</td>
                <td>\${full.codigo ?? ''}</td>
                <td>\${full.nome ?? ''}</td>
                <td>\${full.turno ?? ''}</td>
              </tr>\`);
          });
        });
        if (!tb.children.length) {
          tb.insertAdjacentHTML('beforeend', '<tr><td colspan="6" class="muted">Nenhum vínculo encontrado.</td></tr>');
        }
      }

      document.getElementById('btnReload').addEventListener('click', loadGrid);
      document.getElementById('btnCopy').addEventListener('click', async () => {
        try {
          const [a, b] = await Promise.all([fetch('/instrutores'), fetch('/turmas')]);
          const merged = { ...(await a.json()), ...(await b.json()) };
          await navigator.clipboard.writeText(JSON.stringify(merged, null, 2));
          showToast('JSON copiado para a área de transferência!');
        } catch(e) { showToast('Não foi possível copiar o JSON.', false); }
      });

      function toUrlEncoded(form) { return new URLSearchParams(new FormData(form)); }
      document.querySelectorAll('form[method="POST"]').forEach(form => {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const action = form.getAttribute('action') || window.location.pathname;
          const body = toUrlEncoded(form);
          try {
            const resp = await fetch(action, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
              body
            });
            const data = await resp.json().catch(() => ({}));
            if (resp.ok) {
              let msg = 'Operação realizada com sucesso.';
              if (action.endsWith('/instrutores')) msg = 'Instrutor cadastrado com sucesso.';
              if (action.endsWith('/turmas')) msg = 'Turma cadastrada com sucesso.';
              if (action.includes('/update')) msg = 'Instrutor atualizado com sucesso.';
              if (action.includes('/delete') && action.includes('/instrutores')) msg = 'Instrutor excluído com sucesso.';
              if (action.includes('/delete') && action.includes('/turmas')) msg = 'Turma excluída com sucesso.';
              if (action.includes('/vincular')) msg = 'Vínculo realizado com sucesso.';
              if (data && (data.mensagem || data.erro)) msg = data.mensagem || data.erro;
              showToast(msg, true);
              form.reset();
              loadGrid(); 
            } else {
              let err = 'Falha na operação.';
              if (data) { if (data.erro) err = data.erro; else if (Array.isArray(data.erros)) err = data.erros.join(' | '); }
              showToast(err, false);
            }
          } catch (ex) { showToast('Erro de rede ou servidor indisponível.', false); }
        });
      });

      loadGrid();
    </script>
  </body>
  </html>
  `);
});

const PORT = 3000;
app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
