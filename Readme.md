# Node GPS103 Emulator

Emulador de GPS para o protocolo GPS103, desenvolvido em Node.js.

## Funcionalidades

- Geração de rotas aleatórias em terra
- Simulação de movimento de veículo
- Suporte a comandos de controle (bloqueio, desbloqueio, ligar/desligar motor)
- Comunicação via TCP
- Emulação de dados de bateria e satélites

## Requisitos

- Node.js 14+
- NPM ou Yarn

## Instalação

1. Clone o repositório:
```bash
git clone https://github.com/riccefarias/node-gps103-emulator.git
cd node-gps103-emulator
```

2. Instale as dependências:
```bash
npm install
```

## Uso

Para iniciar o emulador:

```bash
npm start
```

Para desenvolvimento com auto-reload:

```bash
npm run dev
```

## Estrutura do Projeto

```
src/
  ├── config/         # Configurações e variáveis de ambiente
  ├── services/       # Serviços principais (TCP, Roteamento)
  ├── utils/          # Funções utilitárias
  └── index.js        # Ponto de entrada da aplicação
```

## Comandos Suportados

- `LOAD`: Inicia o envio de dados
- `**J`: Bloqueia o veículo
- `**K`: Desbloqueia o veículo
- `**I`: Desliga o motor
- `**E`: Liga o motor

## Licença

ISC

Doações serão bem vindas através do PIX: angelo@kore.ag
