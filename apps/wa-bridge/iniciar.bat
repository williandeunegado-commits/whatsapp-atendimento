@echo off
cd /d "C:\tmp\whatsapp-atendimento\apps\wa-bridge"
pm2 start ecosystem.config.cjs
pm2 save
