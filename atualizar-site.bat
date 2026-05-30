@echo off
chcp 65001 >nul
title Atualizar site - Inforwnet Stock

cd /d "%~dp0"

echo.
echo ==========================================
echo   Atualizar site - Inforwnet Stock
echo ==========================================
echo.

git --version >nul 2>&1
if errorlevel 1 (
  echo ERRO: Git nao encontrado neste computador.
  echo Instale o Git ou confira se ele esta no PATH.
  echo.
  pause
  exit /b 1
)

if not exist ".git" (
  echo ERRO: Esta pasta nao parece ser um repositorio Git.
  echo Abra este arquivo dentro da pasta do projeto.
  echo.
  pause
  exit /b 1
)

echo Conferindo alteracoes locais...
echo.
git status --short
echo.

set "MSG="
set /p MSG=Digite a mensagem da atualizacao e pressione ENTER: 
if "%MSG%"=="" set "MSG=Atualiza site"

echo.
echo Adicionando arquivos...
git add .
if errorlevel 1 goto erro

git diff --cached --quiet
if errorlevel 1 (
  echo.
  echo Criando commit...
  git commit -m "%MSG%"
  if errorlevel 1 goto erro
) else (
  echo.
  echo Nenhuma alteracao nova para commit.
)

echo.
echo Atualizando com o GitHub...
git pull --rebase origin main
if errorlevel 1 (
  echo.
  echo ERRO: Nao consegui atualizar com o GitHub.
  echo Se aparecer conflito, resolva os arquivos marcados e rode este script de novo.
  echo.
  pause
  exit /b 1
)

echo.
echo Enviando para o GitHub...
git push origin main
if errorlevel 1 goto erro

echo.
echo Pronto! Site atualizado no GitHub.
echo Repositorio: https://github.com/fabiojose8759-ui/inforwnet-stock
echo.
pause
exit /b 0

:erro
echo.
echo ERRO: Algo deu errado. Veja a mensagem acima.
echo.
pause
exit /b 1
