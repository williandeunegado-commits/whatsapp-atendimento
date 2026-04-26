import { PrismaClient } from '@prisma/client';

interface CreateDepartmentInput {
  name: string;
  description?: string;
  color?: string;
}

interface UpdateDepartmentInput {
  name?: string;
  description?: string;
  color?: string;
}

export class DepartmentsService {
  constructor(private prisma: PrismaClient) {}

  async create(input: CreateDepartmentInput) {
    const existing = await this.prisma.department.findUnique({ where: { name: input.name } });
    if (existing) {
      throw Object.assign(new Error('Department name already in use'), { statusCode: 409 });
    }

    return this.prisma.department.create({
      data: {
        name: input.name,
        description: input.description,
        color: input.color ?? '#25D366',
      },
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
        createdAt: true,
      },
    });
  }

  async findAll() {
    return this.prisma.department.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
        createdAt: true,
        _count: {
          select: { members: true, conversations: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    return this.prisma.department.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
        createdAt: true,
        updatedAt: true,
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true, avatarUrl: true },
            },
          },
        },
        _count: {
          select: { conversations: true },
        },
      },
    });
  }

  async update(id: string, input: UpdateDepartmentInput) {
    if (input.name) {
      const existing = await this.prisma.department.findFirst({
        where: { name: input.name, NOT: { id } },
      });
      if (existing) {
        throw Object.assign(new Error('Department name already in use'), { statusCode: 409 });
      }
    }

    return this.prisma.department.update({
      where: { id },
      data: input,
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
        updatedAt: true,
      },
    });
  }

  async remove(id: string) {
    // Check for active conversations before deleting
    const activeConversations = await this.prisma.conversation.count({
      where: { departmentId: id, status: { in: ['pending', 'open'] } },
    });

    if (activeConversations > 0) {
      throw Object.assign(
        new Error(`Cannot delete department with ${activeConversations} active conversation(s)`),
        { statusCode: 409 },
      );
    }

    await this.prisma.department.delete({ where: { id } });
  }
}
