import { PrismaClient } from '@prisma/client';

interface CreateLabelInput {
  name: string;
  color?: string;
}

interface UpdateLabelInput {
  name?: string;
  color?: string;
}

export class LabelsService {
  constructor(private prisma: PrismaClient) {}

  async create(input: CreateLabelInput) {
    const existing = await this.prisma.label.findUnique({ where: { name: input.name } });
    if (existing) {
      throw Object.assign(new Error('Label name already in use'), { statusCode: 409 });
    }

    return this.prisma.label.create({
      data: {
        name: input.name,
        color: input.color ?? '#6366f1',
      },
      select: { id: true, name: true, color: true, createdAt: true },
    });
  }

  async findAll() {
    return this.prisma.label.findMany({
      select: {
        id: true,
        name: true,
        color: true,
        createdAt: true,
        _count: { select: { contacts: true, conversations: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    return this.prisma.label.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        name: true,
        color: true,
        createdAt: true,
        _count: { select: { contacts: true, conversations: true } },
      },
    });
  }

  async update(id: string, input: UpdateLabelInput) {
    if (input.name) {
      const existing = await this.prisma.label.findFirst({
        where: { name: input.name, NOT: { id } },
      });
      if (existing) {
        throw Object.assign(new Error('Label name already in use'), { statusCode: 409 });
      }
    }

    return this.prisma.label.update({
      where: { id },
      data: input,
      select: { id: true, name: true, color: true },
    });
  }

  async remove(id: string) {
    await this.prisma.label.delete({ where: { id } });
  }
}
