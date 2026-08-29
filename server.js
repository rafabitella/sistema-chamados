const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

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
    // Chamado criado
    socket.on('novo_chamado', (dados) => {
        io.emit('receber_chamado', dados);
    });

    // Mudança de status (Em Análise / Concluído)
    socket.on('atualizar_status', (dados) => {
        io.emit('status_alterado', dados);
    });

    // Mensagens do chat
    socket.on('enviar_mensagem', (dados) => {
        io.emit('nova_mensagem', dados);
    });

    // Avaliação enviada pelo usuário
    socket.on('enviar_avaliacao', (dados) => {
        io.emit('nova_avaliacao', dados);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});