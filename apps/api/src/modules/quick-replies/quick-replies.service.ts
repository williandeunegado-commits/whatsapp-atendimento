import { PrismaClient } from '@prisma/client';

interface CreateQuickReplyInput {
  trigger: string;
  content: string;
  departmentId?: string;
}

interface UpdateQuickReplyInput {
  trigger?: string;
  content?: string;
  departmentId?: string | null;
}

export class QuickRepliesService {
  constructor(private prisma: PrismaClient) {}

  async create(input: CreateQuickReplyInput) {
    const existing = await this.prisma.quickReply.findUnique({
      where: { trigger: input.trigger },
    });
    if (existing) {
      throw Object.assign(new Error(`Trigger '${input.trigger}' already in use`), { statusCode: 409 });
    }

    if (input.departmentId) {
      await this.prisma.department.findUniqueOrThrow({ where: { id: input.departmentId } });
    }

    return this.prisma.quickReply.create({
      data: {
        trigger: input.trigger,
        content: input.content,
        departmentId: input.departmentId ?? null,
      },
      select: {
        id: true,
        trigger: true,
        content: true,
        departmentId: true,
        createdAt: true,
        department: { select: { id: true, name: true, color: true } },
      },
    });
  }

  async findAll(departmentId?: string) {
    const where: any = {};
    if (departmentId) {
      where.OR = [{ departmentId }, { departmentId: null }];
    }

    return this.prisma.quickReply.findMany({
      where,
      select: {
        id: true,
        trigger: true,
        content: true,
        departmentId: true,
        createdAt: true,
        department: { select: { id: true, name: true, color: true } },
      },
      orderBy: { trigger: 'asc' },
    });
  }

  async findById(id: string) {
    return this.prisma.quickReply.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        trigger: true,
        content: true,
        departmentId: true,
        createdAt: true,
        updatedAt: true,
        department: { select: { id: true, name: true, color: true } },
      },
    });
  }

  async searchByTriggerPrefix(prefix: string, departmentId?: string) {
    if (!prefix || prefix.trim().length === 0) {
      return [];
    }

    const where: any = {
      trigger: { startsWith: prefix, mode: 'insensitive' },
    };

    if (departmentId) {
      where.OR = [{ departmentId }, { departmentId: null }];
    }

    return this.prisma.quickReply.findMany({
      where,
      select: {
        id: true,
        trigger: true,
        content: true,
        department: { select: { id: true, name: true, color: true } },
      },
      orderBy: { trigger: 'asc' },
      take: 10,
    });
  }

  async update(id: string, input: UpdateQuickReplyInput) {
    if (input.trigger) {
      const existing = await this.prisma.quickReply.findFirst({
        where: { trigger: input.trigger, NOT: { id } },
      });
      if (existing) {
        throw Object.assign(new Error(`Trigger '${input.trigger}' already in use`), { statusCode: 409 });
      }
    }

    if (input.departmentId) {
      await this.prisma.department.findUniqueOrThrow({ where: { id: input.departmentId } });
    }

    return this.prisma.quickReply.update({
      where: { id },
      data: input,
      select: {
        id: true,
        trigger: true,
        content: true,
        departmentId: true,
        updatedAt: true,
        department: { select: { id: true, name: true, color: true } },
      },
    });
  }

  async remove(id: string) {
    await this.prisma.quickReply.delete({ where: { id } });
  }
}
