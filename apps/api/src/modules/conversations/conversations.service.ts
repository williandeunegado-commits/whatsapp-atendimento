import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../../lib/logger.js';

interface AssignInput {
  conversationId: string;
  userId: string;
  expectedVersion: number;
}

interface TransferInput {
  conversationId: string;
  fromUserId: string;
  toUserId?: string;
  toDepartmentId?: string;
  note?: string;
}

interface ListInput {
  status?: string;
  departmentId?: string;
  userId?: string;
  labelId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class ConversationsService {
  constructor(private prisma: PrismaClient) {}

  async list(filters: ListInput) {
    const {
      status,
      departmentId,
      userId,
      labelId,
      search,
      page = 1,
      limit = 30,
    } = filters;

    const where: Prisma.ConversationWhereInput = {};
    if (status) where.status = status as any;
    if (departmentId) where.departmentId = departmentId;
    if (userId) where.assignedUserId = userId;
    if (labelId) where.labels = { some: { labelId } };
    if (search) {
      where.contact = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
        ],
      };
    }

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        include: {
          contact: {
            select: {
              id: true,
              name: true,
              phone: true,
              avatarUrl: true,
              isBlocked: true,
            },
          },
          department: { select: { id: true, name: true, color: true } },
          assignedUser: { select: { id: true, name: true, avatarUrl: true } },
          labels: { include: { label: true } },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              type: true,
              content: true,
              direction: true,
              createdAt: true,
              isInternalNote: true,
            },
          },
        },
        orderBy: { lastMessageAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.conversation.count({ where }),
    ]);

    return {
      conversations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
    return this.prisma.conversation.findUniqueOrThrow({
      where: { id },
      include: {
        contact: true,
        department: { select: { id: true, name: true, color: true } },
        assignedUser: { select: { id: true, name: true, avatarUrl: true } },
        labels: { include: { label: true } },
      },
    });
  }

  /**
   * Atribuição com lock otimista + SELECT FOR UPDATE
   * Garante que apenas um atendente ganha quando dois clicam simultaneamente
   */
  async assign(input: AssignInput): Promise<{ conversation: any; won: boolean }> {
    const { conversationId, userId, expectedVersion } = input;

    return this.prisma.$transaction(async (tx) => {
      // SELECT FOR UPDATE bloqueia a linha durante a transação
      const rows = await tx.$queryRaw<
        Array<{
          id: string;
          version: number;
          status: string;
          assigned_user_id: string | null;
        }>
      >`
        SELECT id, version, status, assigned_user_id
        FROM conversations
        WHERE id = ${conversationId}::uuid
        FOR UPDATE
      `;

      const conv = rows[0];
      if (!conv) {
        throw Object.assign(new Error('Conversation not found'), { statusCode: 404 });
      }

      // Verifica se alguém ganhou na frente
      if (conv.version !== expectedVersion || conv.status !== 'pending') {
        logger.warn(
          {
            conversationId,
            userId,
            currentVersion: conv.version,
            expectedVersion,
          },
          'Corrida de atribuição perdida',
        );
        throw Object.assign(
          new Error('Conversa já foi atribuída por outro atendente'),
          { statusCode: 409 },
        );
      }

      // Ganha a corrida
      const updated = await tx.conversation.update({
        where: { id: conversationId },
        data: {
          assignedUserId: userId,
          status: 'open',
          version: { increment: 1 },
        },
        include: {
          contact: {
            select: { id: true, name: true, phone: true, avatarUrl: true },
          },
          assignedUser: { select: { id: true, name: true, avatarUrl: true } },
        },
      });

      // Registra evento
      await tx.conversationEvent.create({
        data: { conversationId, userId, type: 'assigned', data: {} },
      });

      logger.info({ conversationId, userId }, 'Conversa atribuída com sucesso');
      return { conversation: updated, won: true };
    });
  }

  async transfer(input: TransferInput) {
    const { conversationId, fromUserId, toUserId, toDepartmentId, note } = input;

    const updated = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        assignedUserId: toUserId ?? null,
        departmentId: toDepartmentId ?? undefined,
        status: toUserId ? 'open' : 'pending',
        version: { increment: 1 },
      },
      include: {
        contact: {
          select: { id: true, name: true, phone: true, avatarUrl: true },
        },
        assignedUser: { select: { id: true, name: true, avatarUrl: true } },
        department: { select: { id: true, name: true, color: true } },
      },
    });

    await this.prisma.conversationEvent.create({
      data: {
        conversationId,
        userId: fromUserId,
        type: 'transferred',
        data: {
          toUserId: toUserId ?? null,
          toDepartmentId: toDepartmentId ?? null,
          note: note ?? null,
        },
      },
    });

    return updated;
  }

  async resolve(conversationId: string, userId: string) {
    const updated = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: 'resolved',
        resolvedAt: new Date(),
        version: { increment: 1 },
      },
    });

    await this.prisma.conversationEvent.create({
      data: { conversationId, userId, type: 'resolved', data: {} },
    });

    return updated;
  }

  async getMessages(conversationId: string, cursor?: string, limit = 30) {
    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        senderUser: { select: { id: true, name: true, avatarUrl: true } },
        quotedMessage: {
          select: {
            id: true,
            type: true,
            content: true,
            direction: true,
          },
        },
      },
    });

    return { messages: messages.reverse(), hasMore: messages.length === limit };
  }

  async addLabel(conversationId: string, labelId: string) {
    await this.prisma.conversationLabel.upsert({
      where: { conversationId_labelId: { conversationId, labelId } },
      create: { conversationId, labelId },
      update: {},
    });
  }

  async removeLabel(conversationId: string, labelId: string) {
    await this.prisma.conversationLabel.deleteMany({
      where: { conversationId, labelId },
    });
  }

  async getEvents(conversationId: string) {
    return this.prisma.conversationEvent.findMany({
      where: { conversationId },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
