import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // ─── Admin User ───────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@wa.local' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@wa.local',
      passwordHash,
      role: 'admin',
      isActive: true,
    },
  });

  console.log(`Admin user ready: ${admin.email}`);

  // ─── Departments ──────────────────────────────────────────────────────────
  const [vendas, suporte, financeiro] = await Promise.all([
    prisma.department.upsert({
      where: { name: 'Vendas' },
      update: {},
      create: {
        name: 'Vendas',
        description: 'Setor responsável por vendas e novos clientes',
        color: '#25D366',
      },
    }),
    prisma.department.upsert({
      where: { name: 'Suporte' },
      update: {},
      create: {
        name: 'Suporte',
        description: 'Setor responsável por suporte técnico e atendimento',
        color: '#3b82f6',
      },
    }),
    prisma.department.upsert({
      where: { name: 'Financeiro' },
      update: {},
      create: {
        name: 'Financeiro',
        description: 'Setor responsável por cobranças e pagamentos',
        color: '#f59e0b',
      },
    }),
  ]);

  console.log('Departments ready: Vendas, Suporte, Financeiro');

  // ─── Labels ───────────────────────────────────────────────────────────────
  await Promise.all([
    prisma.label.upsert({
      where: { name: 'Urgente' },
      update: {},
      create: { name: 'Urgente', color: '#ef4444' },
    }),
    prisma.label.upsert({
      where: { name: 'VIP' },
      update: {},
      create: { name: 'VIP', color: '#8b5cf6' },
    }),
    prisma.label.upsert({
      where: { name: 'Aguardando' },
      update: {},
      create: { name: 'Aguardando', color: '#f59e0b' },
    }),
  ]);

  console.log('Labels ready: Urgente, VIP, Aguardando');

  // ─── Quick Replies ────────────────────────────────────────────────────────
  await Promise.all([
    // Global quick replies (no department)
    prisma.quickReply.upsert({
      where: { trigger: '/saudacao' },
      update: {},
      create: {
        trigger: '/saudacao',
        content:
          'Olá! Seja bem-vindo(a). Como posso te ajudar hoje?',
        departmentId: null,
      },
    }),
    prisma.quickReply.upsert({
      where: { trigger: '/encerramento' },
      update: {},
      create: {
        trigger: '/encerramento',
        content:
          'Obrigado pelo contato! Caso precise de mais ajuda, estamos à disposição. Tenha um ótimo dia!',
        departmentId: null,
      },
    }),
    // Suporte department quick reply
    prisma.quickReply.upsert({
      where: { trigger: '/bug' },
      update: {},
      create: {
        trigger: '/bug',
        content:
          'Entendemos o problema relatado. Por favor, envie capturas de tela e os passos para reproduzir o erro para que possamos investigar com mais agilidade.',
        departmentId: suporte.id,
      },
    }),
  ]);

  console.log('Quick replies ready: /saudacao, /encerramento, /bug');

  // ─── WhatsApp Session ─────────────────────────────────────────────────────
  // Use updateMany + createMany pattern for idempotency on a table with no
  // natural unique key beyond the generated UUID.
  const sessionCount = await prisma.whatsAppSession.count();

  if (sessionCount === 0) {
    await prisma.whatsAppSession.create({
      data: {
        provider: 'baileys',
        sessionData: null,
        status: 'disconnected',
      },
    });
    console.log('WhatsApp session record created');
  } else {
    console.log('WhatsApp session record already exists — skipped');
  }

  console.log('Seed completed successfully.');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
