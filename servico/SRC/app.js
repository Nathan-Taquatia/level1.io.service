import express from 'express';
import cors from 'cors';
import mysql from 'mysql2';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createPool({
    host:     process.env.DB_HOST     ?? 'rpgtcc2.mysql.dbaas.com.br',
    user:     process.env.DB_USER     ?? 'rpgtcc2',
    password: process.env.DB_PASSWORD ?? 'Rpg@TCC2',
    database: process.env.DB_NAME     ?? 'rpgtcc2',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// ─── EXISTENTES ───────────────────────────────────────────────

app.get('/campanha', (req, res) => {
    db.query('SELECT * FROM campanha', (err, results) => {
        if (err) return res.status(500).json({ erro: 'Erro ao buscar campanhas', detalhe: err.message });
        res.json(results);
    });
});

app.get('/usuario', (req, res) => {
    db.query('SELECT * FROM usuario', (err, results) => {
        if (err) return res.status(500).json({ erro: 'Erro ao buscar usuários', detalhe: err.message });
        res.json(results);
    });
});

app.get('/usuario_campanha', (req, res) => {
    db.query('SELECT * FROM usuario_campanha', (err, results) => {
        if (err) return res.status(500).json({ erro: 'Erro ao buscar vínculos usuário-campanha', detalhe: err.message });
        res.json(results);
    });
});

app.get('/usuario_grupo', (req, res) => {
    db.query('SELECT * FROM usuario_grupo', (err, results) => {
        if (err) return res.status(500).json({ erro: 'Erro ao buscar vínculos usuário-grupo', detalhe: err.message });
        res.json(results);
    });
});

app.get('/sistema', (req, res) => {
    db.query('SELECT * FROM sistema', (err, results) => {
        if (err) return res.status(500).json({ erro: 'Erro ao buscar sistemas', detalhe: err.message });
        res.json(results);
    });
});

app.get('/grupos', (req, res) => {
    db.query('SELECT * FROM grupos', (err, results) => {
        if (err) return res.status(500).json({ erro: 'Erro ao buscar grupos', detalhe: err.message });
        res.json(results);
    });
});

// Login migrado de GET para POST (senha não fica exposta em logs)
app.post('/login', (req, res) => {
    const { emailusuario, mdsenha } = req.body;
    if (!emailusuario || !mdsenha)
        return res.status(400).json({ erro: 'Email e senha são obrigatórios' });

    db.query(
        'SELECT * FROM usuario WHERE emailusuario = ? AND mdsenha = ?',
        [emailusuario, mdsenha],
        (err, results) => {
            if (err) return res.status(500).json({ erro: 'Erro ao realizar login', detalhe: err.message });
            res.json(results);
        }
    );
});

// ─── NOVOS ────────────────────────────────────────────────────

// 1. Cadastrar novo usuário
app.post('/cadastro', (req, res) => {
    const { nomeusuario, emailusuario, mdsenha, apelido } = req.body;
    if (!nomeusuario || !emailusuario || !mdsenha)
        return res.status(400).json({ erro: 'Nome, email e senha são obrigatórios' });

    db.query(
        'INSERT INTO usuario (nomeusuario, emailusuario, mdsenha, apelido) VALUES (?, ?, ?, ?)',
        [nomeusuario, emailusuario, mdsenha, apelido ?? null],
        (err, results) => {
            if (err) return res.status(500).json({ erro: 'Erro ao cadastrar usuário', detalhe: err.message });
            res.status(201).json({ mensagem: 'Usuário cadastrado com sucesso', id_usuario: results.insertId });
        }
    );
});

// 2. Grupos de um usuário
app.get('/grupos/:idusuario', (req, res) => {
    const { idusuario } = req.params;
    db.query(
        `SELECT g.idgrupos, g.gruponomes, g.descricao, ug.role
         FROM grupos g
         INNER JOIN usuario_grupo ug ON g.idgrupos = ug.grupos_idgrupos
         WHERE ug.usuario_idusuario = ?`,
        [idusuario],
        (err, results) => {
            if (err) return res.status(500).json({ erro: 'Erro ao buscar grupos do usuário', detalhe: err.message });
            res.json(results);
        }
    );
});

// 3. Campanhas de um grupo
app.get('/campanhas/:idgrupo', (req, res) => {
    const { idgrupo } = req.params;
    db.query(
        `SELECT c.idcampanha, c.campanhanome, c.datajogo, c.descricao, c.tipo,
                c.dm_idusuario, s.nomesistema
         FROM campanha c
         LEFT JOIN sistema s ON c.idsistema = s.idsistema
         WHERE c.grupos_idgrupos = ?`,
        [idgrupo],
        (err, results) => {
            if (err) return res.status(500).json({ erro: 'Erro ao buscar campanhas do grupo', detalhe: err.message });
            res.json(results);
        }
    );
});

// 4. Criar grupo e vincular criador como mestre
app.post('/grupo', (req, res) => {
    const { gruponomes, descricao, idusuario } = req.body;
    if (!gruponomes || !idusuario)
        return res.status(400).json({ erro: 'Nome do grupo e ID do usuário são obrigatórios' });

    db.query(
        'INSERT INTO grupos (gruponomes, descricao) VALUES (?, ?)',
        [gruponomes, descricao ?? null],
        (err, grupoResult) => {
            if (err) return res.status(500).json({ erro: 'Erro ao criar grupo', detalhe: err.message });

            const idgrupo = grupoResult.insertId;
            db.query(
                'INSERT INTO usuario_grupo (usuario_idusuario, grupos_idgrupos, role) VALUES (?, ?, ?)',
                [idusuario, idgrupo, 'mestre'],
                (err2) => {
                    if (err2) return res.status(500).json({ erro: 'Grupo criado mas erro ao vincular usuário', detalhe: err2.message });
                    res.status(201).json({ mensagem: 'Grupo criado com sucesso', idgrupos: idgrupo });
                }
            );
        }
    );
});

export default app;