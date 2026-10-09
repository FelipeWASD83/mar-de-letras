@echo off
rem Abre o Mar de letras: sobe um servidorzinho na porta 4343 e abre o navegador.
rem Fecha esta janela preta quando terminar.
rem (Aberto direto do arquivo, o navegador nao deixa carregar os scripts.)
cd /d "%~dp0"
start "" "http://127.0.0.1:4343/"
python -m http.server 4343 --bind 127.0.0.1
