Para usar este emulador, instale o docker em sua VPS.

Baixe os arquivos para uma pasta em sua VPS.


Execute o seguinte comando:
docker build . --tag=emulador-103


Aguarde a conclusão da Build



Para iniciar um emulador execute o seguinte comando
docker run -e linha=XXXX -e ip=IPDOSERVIDOR -e port=5001


O imei do dispositivo será: KOREXXXX

Onde XXXX é o numero da linha a ser replicado



Doações serão bem vindas através do PIX: angelo@kore.ag