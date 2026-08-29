const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Conexão e criação das tabelas no SQLite
const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'), (err) => {
    if (err) {
        console.error('Erro ao conectar ao SQLite:', err.message);
    } else {
        console.log('Banco de dados SQLite conectado com sucesso.');
    }
});

db.serialize(() => {
    // Tabela de Chamados
    db.run(`
        CREATE TABLE IF NOT EXISTS chamados (
            id TEXT PRIMARY KEY,
            nome TEXT NOT NULL,
            setor TEXT NOT NULL,
            descricao TEXT NOT NULL,
            hora TEXT NOT NULL,
            status TEXT DEFAULT 'aguardando',
            nota INTEGER DEFAULT NULL,
            comentario TEXT DEFAULT NULL
        )
    `);

    // Tabela de Mensagens do Chat
    db.run(`
        CREATE TABLE IF NOT EXISTS mensagens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chamado_id TEXT NOT NULL,
            autor TEXT NOT NULL,
            tipoOrigem TEXT NOT NULL,
            texto TEXT NOT NULL,
            hora TEXT NOT NULL,
            FOREIGN KEY (chamado_id) REFERENCES chamados(id)
        )
    `);
});

app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/painel', (req, res) => {
    res.sendFile(path.join(__dirname, 'painel.html'));
});

app.get('/painel.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'painel.html'));
});

io.on('connection', (socket) => {
    // Ao carregar o painel, busca todos os chamados e suas mensagens
    socket.on('carregar_historico', () => {
        db.all(`SELECT * FROM chamados ORDER BY rowid DESC`, [], (err, chamados) => {
            if (err) return console.error(err.message);

            db.all(`SELECT * FROM mensagens ORDER BY id ASC`, [], (errMsgs, msgs) => {
                if (errMsgs) return console.error(errMsgs.message);
                socket.emit('historico_carregado', { chamados, mensagens: msgs });
            });
        });
    });

    // Salvar e emitir novo chamado
    socket.on('novo_chamado', (chamado) => {
        const query = `
            INSERT INTO chamados (id, nome, setor, descricao, hora, status)
            VALUES (?, ?, ?, ?, ?, 'aguardando')
        `;
        db.run(query, [chamado.id, chamado.nome, chamado.setor, chamado.descricao, chamado.hora], (err) => {
            if (err) return console.error(err.message);
            io.emit('receber_chamado', { ...chamado, status: 'aguardando' });
        });
    });

    // Atualizar status (em_analise ou concluido)
    socket.on('atualizar_status', (dados) => {
        const query = `UPDATE chamados SET status = ? WHERE id = ?`;
        db.run(query, [dados.status, dados.id], (err) => {
            if (err) return console.error(err.message);
            io.emit('status_alterado', dados);
        });
    });

    // Salvar e emitir mensagem do chat
    socket.on('enviar_mensagem', (msg) => {
        const query = `
            INSERT INTO mensagens (chamado_id, autor, tipoOrigem, texto, hora)
            VALUES (?, ?, ?, ?, ?)
        `;
        db.run(query, [msg.chamadoId, msg.autor, msg.tipoOrigem, msg.texto, msg.hora], (err) => {
            if (err) return console.error(err.message);
            io.emit('nova_mensagem', msg);
        });
    });

    // Salvar e emitir avaliação
    socket.on('enviar_avaliacao', (dados) => {
        const query = `UPDATE chamados SET nota = ?, comentario = ? WHERE id = ?`;
        db.run(query, [dados.nota, dados.comentario, dados.chamadoId], (err) => {
            if (err) return console.error(err.message);
            io.emit('nova_avaliacao', dados);
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});