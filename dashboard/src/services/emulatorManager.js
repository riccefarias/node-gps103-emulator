const { spawn } = require('child_process');
const EventEmitter = require('events');
const storageService = require('./storageService');
const path = require('path');

class EmulatorManager extends EventEmitter {
    constructor() {
        super();
        this.emulators = new Map();
        this.restartIntervals = new Map();
        this.emulatorPath = path.resolve(__dirname, '../../../src/index.js');
        this.loadEmulators();
    }

    loadEmulators() {
        const savedEmulators = storageService.loadEmulators();
        savedEmulators.forEach(emulator => {
            this.emulators.set(emulator.id, emulator);
            // Inicia o emulador se ele estava rodando quando foi salvo
            if (emulator.status === 'running') {
                this.startEmulator(emulator.id);
            }
            // Inicia o auto-restart se estiver configurado
            if (emulator.config.autoRestart) {
                this.startAutoRestart(emulator.id);
            }
        });
    }

    createEmulator(config) {
        const { imei, ip, port, startPoint, endPoint, autoRestart = false, restartDelay = 5000 } = config;
        
        // Verifica se já existe um emulador com o mesmo IMEI
        const existingEmulator = Array.from(this.emulators.values()).find(
            e => e.config.imei === imei
        );
        
        if (existingEmulator) {
            throw new Error(`Já existe um emulador com o IMEI ${imei}`);
        }

        const emulatorInfo = {
            id: Date.now().toString(),
            config: {
                imei,
                ip,
                port,
                startPoint,
                endPoint,
                autoRestart,
                restartDelay
            },
            status: 'stopped',
            process: null,
            logs: [],
            currentPosition: null,
            restartCount: 0,
            lastRestart: null
        };

        this.emulators.set(emulatorInfo.id, emulatorInfo);
        storageService.saveEmulator(emulatorInfo);
        this.emit('emulator:created', emulatorInfo);

        // Inicia o emulador automaticamente após a criação
        this.startEmulator(emulatorInfo.id);

        // Inicia o auto-restart se estiver configurado
        if (autoRestart) {
            this.startAutoRestart(emulatorInfo.id);
        }

        return emulatorInfo;
    }

    startAutoRestart(id) {
        const emulatorInfo = this.emulators.get(id);
        if (!emulatorInfo) {
            throw new Error('Emulador não encontrado');
        }

        if (!emulatorInfo.config.autoRestart) {
            return;
        }

        // Limpa intervalo existente se houver
        this.stopAutoRestart(id);

        // Configura novo intervalo
        const interval = setInterval(() => {
            const currentEmulator = this.emulators.get(id);
            if (!currentEmulator) {
                this.stopAutoRestart(id);
                return;
            }

            if (currentEmulator.status === 'stopped' || currentEmulator.status === 'error') {
                this.restartEmulator(id);
                currentEmulator.restartCount++;
                currentEmulator.lastRestart = new Date();
                this.emit('emulator:status', { 
                    id, 
                    status: 'restarting',
                    restartCount: currentEmulator.restartCount,
                    lastRestart: currentEmulator.lastRestart
                });
            }
        }, emulatorInfo.config.restartDelay);

        this.restartIntervals.set(id, interval);
    }

    stopAutoRestart(id) {
        const interval = this.restartIntervals.get(id);
        if (interval) {
            clearInterval(interval);
            this.restartIntervals.delete(id);
        }
    }

    startEmulator(id) {
        const emulatorInfo = this.emulators.get(id);
        if (!emulatorInfo) {
            throw new Error('Emulador não encontrado');
        }

        if (emulatorInfo.process) {
            throw new Error('Emulador já está em execução');
        }

        const { imei, ip, port, startPoint, endPoint } = emulatorInfo.config;

        const emulatorProcess = spawn('node', [this.emulatorPath], {
            env: {
                ...process.env,
                imei,
                host: ip,
                port,
                startLat: startPoint ? startPoint.lat : null,
                startLng: startPoint ? startPoint.lng : null,
                endLat: endPoint ? endPoint.lat : null,
                endLng: endPoint ? endPoint.lng : null
            }
        });

        emulatorInfo.process = emulatorProcess;
        emulatorInfo.status = 'running';
        this.emulators.set(id, emulatorInfo);
        storageService.saveEmulator(emulatorInfo);
        this.emit('emulator:status', { id, status: 'running' });

        emulatorProcess.stdout.on('data', (data) => {
            const log = {
                timestamp: Date.now(),
                message: data.toString().trim(),
                type: 'info'
            };

            emulatorInfo.logs.push(log);
            if (emulatorInfo.logs.length > 100) {
                emulatorInfo.logs.shift();
            }

            this.emit('emulator:log', { id, log });

            // Tenta extrair a posição do log
            const positionMatch = data.toString().match(/Position: (-?\d+\.\d+), (-?\d+\.\d+)/);
            if (positionMatch) {
                const position = {
                    lat: parseFloat(positionMatch[1]),
                    lng: parseFloat(positionMatch[2])
                };
                emulatorInfo.currentPosition = position;
                this.emit('emulator:position', { id, position });
            }
        });

        emulatorProcess.stderr.on('data', (data) => {
            const log = {
                timestamp: Date.now(),
                message: data.toString().trim(),
                type: 'error'
            };

            emulatorInfo.logs.push(log);
            if (emulatorInfo.logs.length > 100) {
                emulatorInfo.logs.shift();
            }

            this.emit('emulator:log', { id, log });
        });

        emulatorProcess.on('close', (code) => {
            emulatorInfo.process = null;
            emulatorInfo.status = 'stopped';
            this.emulators.set(id, emulatorInfo);
            storageService.saveEmulator(emulatorInfo);
            this.emit('emulator:status', { id, status: 'stopped' });
        });

        emulatorProcess.on('error', (error) => {
            emulatorInfo.process = null;
            emulatorInfo.status = 'error';
            this.emulators.set(id, emulatorInfo);
            storageService.saveEmulator(emulatorInfo);
            this.emit('emulator:status', { id, status: 'error', error: error.message });
        });
    }

    stopEmulator(id) {
        const emulatorInfo = this.emulators.get(id);
        if (!emulatorInfo) {
            throw new Error('Emulador não encontrado');
        }

        if (emulatorInfo.process) {
            emulatorInfo.process.kill();
            emulatorInfo.process = null;
        }

        emulatorInfo.status = 'stopped';
        this.emulators.set(id, emulatorInfo);
        storageService.saveEmulator(emulatorInfo);
        this.emit('emulator:status', { id, status: 'stopped' });
    }

    restartEmulator(id) {
        const emulatorInfo = this.emulators.get(id);
        if (!emulatorInfo) {
            throw new Error('Emulador não encontrado');
        }

        if (emulatorInfo.process) {
            emulatorInfo.process.kill();
            emulatorInfo.process = null;
        }

        emulatorInfo.status = 'stopped';
        this.emulators.set(id, emulatorInfo);
        storageService.saveEmulator(emulatorInfo);
        this.emit('emulator:status', { id, status: 'stopped' });

        // Inicia o emulador novamente
        this.startEmulator(id);
    }

    toggleAutoRestart(id) {
        const emulatorInfo = this.emulators.get(id);
        if (!emulatorInfo) {
            throw new Error('Emulador não encontrado');
        }

        emulatorInfo.config.autoRestart = !emulatorInfo.config.autoRestart;
        this.emulators.set(id, emulatorInfo);
        storageService.saveEmulator(emulatorInfo);

        if (emulatorInfo.config.autoRestart) {
            this.startAutoRestart(id);
        } else {
            this.stopAutoRestart(id);
        }

        this.emit('emulator:status', { 
            id, 
            status: emulatorInfo.status,
            autoRestart: emulatorInfo.config.autoRestart
        });
    }

    sendCommand(id, command) {
        const emulatorInfo = this.emulators.get(id);
        if (!emulatorInfo) {
            throw new Error('Emulador não encontrado');
        }

        if (!emulatorInfo.process) {
            throw new Error('Emulador não está em execução');
        }

        emulatorInfo.process.stdin.write(command + '\n');
        this.emit('emulator:command', { id, command, success: true });
    }

    getEmulators() {
        return Array.from(this.emulators.values());
    }

    getEmulator(id) {
        return this.emulators.get(id);
    }
}

module.exports = new EmulatorManager(); 