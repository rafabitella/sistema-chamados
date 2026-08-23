const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve os arquivos da pasta atual (index.html, painel.html, style.css)
app.use(express.static(path.join(__dirname)));

io.on('connection', (socket) => {
    // Escuta novos chamados enviados pelo formulário
    socket.on('novo_chamado', (dados) => {
        // Envia para todos os painéis conectados em tempo real
        io.emit('receber_chamado', dados);
    });
});

// Substitua: const PORT = 3000;
// Por:
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});