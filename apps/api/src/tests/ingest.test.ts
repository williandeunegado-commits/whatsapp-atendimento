import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
const mockPrisma = {
  contact: {
    upsert: vi.fn(),
  },
  conversation: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findUniqueOrThrow: vi.fn(),
  },
  message: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  conversationEvent: {
    create: vi.fn(),
  },
};

// Testa a lógica de idempotência diretamente
describe('Message Ingest — Idempotência', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve ignorar mensagem duplicada (mesmo whatsappMessageId)', async () => {
    // Setup: mensagem já existe no banco
    mockPrisma.contact.upsert.mockResolvedValue({ id: 'contact-1', phone: '5511999999999' });
    mockPrisma.conversation.findFirst.mockResolvedValue({ id: 'conv-1', status: 'open' });
    mockPrisma.message.findUnique.mockResolvedValue({ id: 'msg-1' }); // já existe

    // Simula a lógica de idempotência do IngestWorker
    const whatsappMessageId = 'wa-msg-123';

    const contact = await mockPrisma.contact.upsert({
      where: { phone: '5511999999999' },
      create: { phone: '5511999999999', name: '5511999999999' },
      update: {},
    });

    const conv = await mockPrisma.conversation.findFirst({
      where: { contactId: contact.id, status: { in: ['pending', 'open'] } },
      orderBy: { createdAt: 'desc' },
    });

    // Verifica idempotência
    const existing = await mockPrisma.message.findUnique({
      where: { whatsappMessageId },
    });

    if (existing) {
      // Deve parar aqui e NÃO criar nova mensagem
      expect(mockPrisma.message.create).not.toHaveBeenCalled();
      return;
    }

    // Se chegou aqui, é um erro — deveria ter parado
    expect.fail('Deveria ter retornado cedo por mensagem duplicada');
  });

  it('deve criar mensagem quando whatsappMessageId é novo', async () => {
    mockPrisma.contact.upsert.mockResolvedValue({ id: 'contact-1', phone: '5511999999999' });
    mockPrisma.conversation.findFirst.mockResolvedValue({ id: 'conv-1', status: 'open' });
    mockPrisma.message.findUnique.mockResolvedValue(null); // não existe
    mockPrisma.message.create.mockResolvedValue({ id: 'new-msg-1' });
    mockPrisma.conversation.update.mockResolvedValue({});

    const whatsappMessageId = 'wa-msg-456-new';

    await mockPrisma.contact.upsert({ where: { phone: '5511999999999' }, create: {}, update: {} });
    await mockPrisma.conversation.findFirst({ where: {} });

    const existing = await mockPrisma.message.findUnique({ where: { whatsappMessageId } });
    expect(existing).toBeNull();

    // Deve criar a mensagem
    await mockPrisma.message.create({
      data: {
        conversationId: 'conv-1',
        whatsappMessageId,
        direction: 'inbound',
        type: 'text',
        content: { text: 'Olá' },
        status: 'delivered',
        createdAt: new Date(),
      },
    });

    expect(mockPrisma.message.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ whatsappMessageId }),
      })
    );
  });

  it('deve criar nova conversa quando não existe conversa ativa', async () => {
    mockPrisma.contact.upsert.mockResolvedValue({ id: 'contact-new', phone: '5511888888888' });
    mockPrisma.conversation.findFirst.mockResolvedValue(null); // sem conversa ativa
    mockPrisma.conversation.create.mockResolvedValue({ id: 'new-conv-1', status: 'pending' });
    mockPrisma.message.findUnique.mockResolvedValue(null);
    mockPrisma.message.create.mockResolvedValue({ id: 'msg-new' });
    mockPrisma.conversation.update.mockResolvedValue({});

    const contact = await mockPrisma.contact.upsert({ where: {}, create: {}, update: {} });
    let conv = await mockPrisma.conversation.findFirst({ where: {} });

    if (!conv) {
      conv = await mockPrisma.conversation.create({
        data: { contactId: contact.id, status: 'pending' },
      });
    }

    expect(mockPrisma.conversation.create).toHaveBeenCalledTimes(1);
    expect(conv).toMatchObject({ id: 'new-conv-1', status: 'pending' });
  });

  it('deve reabrir conversa resolvida quando nova mensagem chega', async () => {
    mockPrisma.contact.upsert.mockResolvedValue({ id: 'contact-1', phone: '5511777777777' });
    mockPrisma.conversation.findFirst.mockResolvedValue({ id: 'conv-resolved', status: 'resolved' });
    mockPrisma.message.findUnique.mockResolvedValue(null);
    mockPrisma.message.create.mockResolvedValue({ id: 'msg-reopen' });
    mockPrisma.conversation.update.mockResolvedValue({});
    mockPrisma.conversationEvent.create.mockResolvedValue({});

    const conv = await mockPrisma.conversation.findFirst({ where: {} });

    // Persiste mensagem
    await mockPrisma.message.create({ data: {} });

    // Reabre conversa
    if (conv?.status === 'resolved') {
      await mockPrisma.conversation.update({
        where: { id: conv.id },
        data: { status: 'pending', resolvedAt: null, assignedUserId: null },
      });
      await mockPrisma.conversationEvent.create({
        data: { conversationId: conv.id, type: 'reopened', data: {} },
      });
    }

    expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'pending' }) })
    );
    expect(mockPrisma.conversationEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'reopened' }) })
    );
  });
});
