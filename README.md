# API Instrutor — README Acadêmico

> **Curso:** Sistemas de Informação – Univale  
> **Disciplina:** Desenvolvimento Web  
> **Projeto:** API Instrutores & Turmas (Node.js + Express)  
> **Autor:** Vitor Manoel Vidal Braz — @vmengine2025  
> **Professor orientador:** Patrick Vinícius Estevão de Oliveira  
> **Versão:** 1.0.0

## 1) Resumo

Esta API acadêmica implementa o **cadastro e o relacionamento entre Instrutores e Turmas**, com **validações, regras de negócio** e **endpoints REST** para criação, consulta, atualização, vinculação e exclusão. Inclui *seeds* iniciais e uma **interface HTML** em `/` para demonstração (data grids e formulários para testar as rotas).

## 2) Objetivos de Aprendizagem

- Praticar **modelagem e implementação** de uma API REST com Node.js + Express.  
- Exercitar **validações** (CPF, telefone, formatação de nome e data).  
- Aplicar **regras de negócio**: evitar duplicidades, proibir exclusões indevidas, etc.  
- Manipular **relacionamentos** (Instrutor ↔ Turma).  
- Produzir **evidências** com Insomnia (coleção de requisições e prints).

## 3) Arquitetura do Código

api-instrutor/
├─ public/                # Imagens e arquivos estáticos (UI de demonstração)
├─ src/
│  └─ index.js            # Servidor Express + rotas + validações + seeds
├─ package.json           # Scripts de execução e dependências
└─ package-lock.json
└─ README.md              # Documentação do projeto

### Principais componentes (src/index.js)

- **Seeds:** popula turmas e instrutores ao subir o servidor.  
- **Utils de formatação:**
  - `nameFormatted(nome)`: Nome em **MAIÚSCULAS**.  
  - `cpfFormatted(cpf)`: Padrão `000.000.000-00` (exige 11 dígitos).  
  - `cellFormatted(cel)`: Padrão `(00) 00000-0000` (11 dígitos).  
  - `dateFormatted(d)`: ISO `YYYY-MM-DD` (aceita `DD/MM/YYYY` e converte).  
- **Middlewares / regras:**
  - Evita **duplicidade** de registro/CPF (instrutor) e de **código** (turma).  
  - **Verifica existência** e **bloqueia exclusões** quando houver vínculos.  
  - **Auth simples** por header `x-auth: admin` em rotas protegidas.  
- **Interface:** rota `/` serve um HTML de demonstração com data grids e formulários.  
- **Static:** `app.use(express.static('public'))` para servir imagens/ícones.

## 4) Como Executar Localmente

> **Pré-requisitos:** Node.js 18+

1. Instale as dependências:
   npm install

2. Desenvolvimento (hot reload com nodemon):
   npm run dev
  
3. Produção:
   npm start

4. Acesse:
   - UI de demonstração: **http://localhost:3000/**  
   - API base: **http://localhost:3000**

> Os **seeds** são carregados automaticamente ao iniciar.

## 5) Endpoints (Resumo)

### Instrutores

- **POST** `/instrutores` – cria instrutor (registro, nome, cpf, [email], [dataNascimento], [telefone])  
- **GET** `/instrutores` – lista + filtros (`nome`, `registro`, `cpf`, `hasTurmas`, `turmaId`)  
- **GET** `/instrutores/registro/:registro` – busca por registro  
- **GET** `/instrutores/cpf/:cpf` – busca por cpf (com/sem máscara)  
- **GET** `/instrutores/nome?q=` – busca por trecho do nome  
- **PATCH** `/instrutores/:registro` – atualiza **nome, email, dataNascimento, telefone**  
  - ❌ Não permite alterar `registro`, `cpf` ou lista de `turmas`.  
- **DELETE** `/instrutores/:registro` – exclui instrutor  
- **PUT** `/instrutores/:registro/turmas/:id` – vincula uma turma ao instrutor  
- **GET** `/instrutores/:registro/turmas?detalhes=true|false` – retorna turmas vinculadas (ids ou detalhes)

### Turmas

- **POST** `/turmas` – cria turma (código, nome, [turno])  
- **GET** `/turmas?turno=&codigo=&nomes=true|false` – lista turmas (com nomes de instrutores)  
- **GET** `/turmas/:id` – **protegido** (`x-auth: admin`) retorna turma + instrutores  
- **DELETE** `/turmas/:id` – **protegido** (`x-auth: admin`) remove turma se não estiver vinculada  

> **Rotas auxiliares da UI acadêmica:**  
> `POST /instrutores/update`, `POST /instrutores/delete`, `POST /turmas/delete`.

## 6) 🔗 Vínculos Instrutor ↔ Turma

### Criar Vínculo
- **PUT** `/instrutores/:registro/turmas/:id`  
  - Exemplo: `/instrutores/J004/turmas/1`  
  - Vincula a turma `id=1` ao instrutor `J004`.  
  - ❌ Bloqueia se já houver vínculo.

- **POST** `/instrutores/vincular` *(rota auxiliar da UI)*  
  { "registro": "J004", "idTurma": 1 }

### Consultar Vínculos
- **GET** `/instrutores/:registro/turmas?detalhes=true` → retorna turmas detalhadas  
- **GET** `/instrutores/:registro/turmas?detalhes=false` → retorna apenas IDs  

### Listar Vínculos por Turma
- **GET** `/turmas/:id` (proteção `x-auth: admin`) retorna turma + instrutores

### Regras de Vínculo
- ❌ Não permitir **vínculo duplicado** (mesma turma já atribuída).  
- ❌ Não permitir **exclusão de turmas** que ainda possuam vínculos.

## 7) Guia Rápido — Testes no **Insomnia**

> A API aceita **JSON** (`application/json`) e **Form URL-Encoded**.  
> Abaixo, exemplos em **JSON**.

### Criar Instrutor
{
  "registro": "J004",
  "nome": "Joana Silva",
  "cpf": "12345678901",
  "email": "joana@exemplo.com",
  "dataNascimento": "1995-02-18",
  "telefone": "31988887777"
}

### Atualizar Instrutor
{
  "nome": "JOANA M. SILVA",
  "email": "joana.silva@exemplo.com",
  "telefone": "31999990000",
  "dataNascimento": "1995-02-20"
}

### Criar Turma
{
  "codigo": "T-10",
  "nome": "Algoritmos",
  "turno": "Noite"
}

### Vincular Turma ao Instrutor
{ "registro": "J004", "idTurma": 1 }

### Excluir Turma (rota protegida)
Header:
x-auth: admin

## 8) Códigos de Resposta

- `200 OK` – Operação concluída  
- `201 Created` – Recurso criado  
- `400 Bad Request` – Validação falhou  
- `401 Unauthorized` – Token ausente ou inválido  
- `404 Not Found` – Recurso não encontrado  

## 9) Considerações Finais

- Padronizar 100% para rotas REST (remover auxiliares `POST`).  
- Adicionar **validação de CPF por dígito verificador**.  
- Melhorar organização em camadas (`routes/`, `middlewares/`, `utils/`).  
- Adicionar **testes automatizados** (Jest + supertest).  

## 10) Créditos e Licença

Projeto desenvolvido para fins **didáticos/avaliativos**.  
Código sob **MIT License** (ver `package.json`).  
Imagens da pasta `public/` de uso acadêmico.  
