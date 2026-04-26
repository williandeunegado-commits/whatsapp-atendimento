import { PrismaClient } from '@prisma/client';

interface CreateContactInput {
  phone: string;
  name: string;
  avatarUrl?: string;
  notes?: string;
}

interface UpdateContactInput {
  name?: string;
  avatarUrl?: string;
  notes?: string;
}

interface FindAllOptions {
  page?: number;
  limit?: number;
  search?: string;
  isBlocked?: boolean;
  labelId?: string;
}

export class ContactsService {
  constructor(private prisma: PrismaClient) {}

  async create(input: CreateContactInput) {
    const existing = await this.prisma.contact.findUnique({ where: { phone: input.phone } });
    if (existing) {
      throw Object.assign(new Error('Phone number already registered'), { statusCode: 409 });
    }

    return this.prisma.contact.create({
      data: input,
      select: {
        id: true,
        phone: true,
        name: true,
        avatarUrl: true,
        notes: true,
        isBlocked: true,
        createdAt: true,
      },
    });
  }

  async upsertByPhone(phone: string, data: { name: string; avatarUrl?: string }) {
    return this.prisma.contact.upsert({
      where: { phone },
      create: { phone, ...data },
      update: { name: data.name, ...(data.avatarUrl ? { avatarUrl: data.avatarUrl } : {}) },
      select: {
        id: true,
        phone: true,
        name: true,
        avatarUrl: true,
        isBlocked: true,
      },
    });
  }

  async findAll(options: FindAllOptions = {}) {
    const { page = 1, limit = 20, search, isBlocked, labelId } = options;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    if (isBlocked !== undefined) {
      where.isBlocked = isBlocked;
    }

    if (labelId) {
      where.labels = { some: { labelId } };
    }

    const [total, data] = await Promise.all([
      this.prisma.contact.count({ where }),
      this.prisma.contact.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          phone: true,
          name: true,
          avatarUrl: true,
          isBlocked: true,
          createdAt: true,
          labels: {
            include: { label: { select: { id: true, name: true, color: true } } },
          },
          _count: { select: { conversations: true } },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const contact = await this.prisma.contact.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        phone: true,
        name: true,
        avatarUrl: true,
        notes: true,
        isBlocked: true,
        createdAt: true,
        updatedAt: true,
        labels: {
          include: { label: { select: { id: true, name: true, color: true } } },
        },
        conversations: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            resolvedAt: true,
            lastMessageAt: true,
            assignedUser: { select: { id: true, name: true, avatarUrl: true } },
            department: { select: { id: true, name: true, color: true } },
            _count: { select: { messages: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    return contact;
  }

  async update(id: string, input: UpdateContactInput) {
    return this.prisma.contact.update({
      where: { id },
      data: input,
      select: {
        id: true,
        phone: true,
        name: true,
        avatarUrl: true,
        notes: true,
        isBlocked: true,
        updatedAt: true,
      },
    });
  }

  async block(id: string) {
    return this.prisma.contact.update({
      where: { id },
      data: { isBlocked: true },
      select: { id: true, phone: true, isBlocked: true },
    });
  }

  async unblock(id: string) {
    return this.prisma.contact.update({
      where: { id },
      data: { isBlocked: false },
      select: { id: true, phone: true, isBlocked: true },
    });
  }

  async addLabel(contactId: string, labelId: string) {
    // Verify label exists
    await this.prisma.label.findUniqueOrThrow({ where: { id: labelId } });

    return this.prisma.contactLabel.upsert({
      where: { contactId_labelId: { contactId, labelId } },
      create: { contactId, labelId },
      update: {},
    });
  }

  async removeLabel(contactId: string, labelId: string) {
    await this.prisma.contactLabel.delete({
      where: { contactId_labelId: { contactId, labelId } },
    });
  }
}
