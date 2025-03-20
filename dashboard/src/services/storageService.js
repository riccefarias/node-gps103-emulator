const fs = require('fs');
const path = require('path');

class StorageService {
    constructor() {
        this.dataPath = path.join(__dirname, '../../data');
        this.emulatorsPath = path.join(this.dataPath, 'emulators.json');
        this.ensureDataDirectory();
    }

    ensureDataDirectory() {
        if (!fs.existsSync(this.dataPath)) {
            fs.mkdirSync(this.dataPath, { recursive: true });
        }
    }

    saveEmulators(emulators) {
        try {
            fs.writeFileSync(this.emulatorsPath, JSON.stringify(emulators, null, 2));
            return true;
        } catch (error) {
            console.error('Erro ao salvar emuladores:', error);
            return false;
        }
    }

    loadEmulators() {
        try {
            if (fs.existsSync(this.emulatorsPath)) {
                const data = fs.readFileSync(this.emulatorsPath, 'utf8');
                return JSON.parse(data);
            }
            return [];
        } catch (error) {
            console.error('Erro ao carregar emuladores:', error);
            return [];
        }
    }

    saveEmulator(emulator) {
        try {
            const emulators = this.loadEmulators();
            const index = emulators.findIndex(e => e.id === emulator.id);
            
            // Limpa os dados do processo antes de salvar
            const cleanEmulator = {
                ...emulator,
                process: null // Remove o objeto process que não pode ser serializado
            };
            
            if (index >= 0) {
                emulators[index] = cleanEmulator;
            } else {
                emulators.push(cleanEmulator);
            }
            
            return this.saveEmulators(emulators);
        } catch (error) {
            console.error('Erro ao salvar emulador:', error);
            return false;
        }
    }

    deleteEmulator(emulatorId) {
        try {
            const emulators = this.loadEmulators();
            const filteredEmulators = emulators.filter(e => e.id !== emulatorId);
            return this.saveEmulators(filteredEmulators);
        } catch (error) {
            console.error('Erro ao deletar emulador:', error);
            return false;
        }
    }
}

module.exports = new StorageService(); 