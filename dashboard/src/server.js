const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const emulatorManager = require('./services/emulatorManager');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

// Rota para obter a lista de emuladores
app.get('/api/emulators', (req, res) => {
    try {
        const emulators = emulatorManager.getEmulators();
        res.json(emulators);
    } catch (error) {
        console.error('Erro ao obter emuladores:', error);
        res.status(500).json({ error: 'Erro ao obter emuladores' });
    }
});

// Rota para obter um emulador específico
app.get('/api/emulators/:id', (req, res) => {
    try {
        const emulator = emulatorManager.getEmulator(req.params.id);
        if (!emulator) {
            return res.status(404).json({ error: 'Emulador não encontrado' });
        }
        res.json(emulator);
    } catch (error) {
        console.error('Erro ao obter emulador:', error);
        res.status(500).json({ error: 'Erro ao obter emulador' });
    }
});

// Configuração do WebSocket
io.on('connection', (socket) => {
    console.log('Cliente conectado');

    // Envia a lista inicial de emuladores
    socket.emit('emulators:list', emulatorManager.getEmulators());

    // Eventos de emulador
    socket.on('create_emulator', (config) => {
        try {
            emulatorManager.createEmulator(config);
        } catch (error) {
            socket.emit('emulator:error', { error: error.message });
        }
    });

    socket.on('stop_emulator', (id) => {
        try {
            emulatorManager.stopEmulator(id);
        } catch (error) {
            socket.emit('emulator:error', { error: error.message });
        }
    });

    socket.on('restart_emulator', (id) => {
        try {
            emulatorManager.restartEmulator(id);
        } catch (error) {
            socket.emit('emulator:error', { error: error.message });
        }
    });

    socket.on('toggle_auto_restart', (id) => {
        try {
            emulatorManager.toggleAutoRestart(id);
        } catch (error) {
            socket.emit('emulator:error', { error: error.message });
        }
    });

    socket.on('send_command', ({ id, command }) => {
        try {
            emulatorManager.sendCommand(id, command);
        } catch (error) {
            socket.emit('emulator:error', { error: error.message });
        }
    });

    socket.on('disconnect', () => {
        console.log('Cliente desconectado');
    });
});

// Repassa eventos do EmulatorManager para os clientes WebSocket
emulatorManager.on('emulator:created', (data) => {
    io.emit('emulator:created', data);
});

emulatorManager.on('emulator:status', (data) => {
    io.emit('emulator:status', data);
});

emulatorManager.on('emulator:log', (data) => {
    io.emit('emulator:log', data);
});

emulatorManager.on('emulator:position', (data) => {
    io.emit('emulator:position', data);
});

emulatorManager.on('emulator:error', (data) => {
    io.emit('emulator:error', data);
});

emulatorManager.on('emulator:command', (data) => {
    io.emit('emulator:command', data);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
}); 