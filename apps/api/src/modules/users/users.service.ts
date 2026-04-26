import bcrypt from 'bcrypt';
import { PrismaClient, UserRole } from '@prisma/client';

interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

interface UpdateUserInput {
  name?: string;
  role?: UserRole;
  avatarUrl?: string;
  isActive?: boolean;
}

export class UsersService {
  constructor(private prisma: PrismaClient) {}

  async create(input: CreateUserInput) {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw Object.assign(new Error('Email already in use'), { statusCode: 409 });
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    return this.prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role ?? 'attendant',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
        departments: {
          include: {
            department: {
              select: { id: true, name: true, color: true },
            },
          },
        },
      },
    });
  }

  async update(id: string, input: UpdateUserInput) {
    return this.prisma.user.update({
      where: { id },
      data: input,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        isActive: true,
      },
    });
  }

  async changePassword(id: string, newPassword: string) {
    if (newPassword.length < 6) {
      throw Object.assign(new Error('Password must be at least 6 characters'), { statusCode: 400 });
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
  }

  async addToDepartment(
    userId: string,
    departmentId: string,
    role: 'supervisor' | 'attendant' = 'attendant',
  ) {
    // Verify both records exist
    await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    await this.prisma.department.findUniqueOrThrow({ where: { id: departmentId } });

    return this.prisma.userDepartment.upsert({
      where: { userId_departmentId: { userId, departmentId } },
      create: { userId, departmentId, role },
      update: { role },
    });
  }

  async removeFromDepartment(userId: string, departmentId: string) {
    await this.prisma.userDepartment.delete({
      where: { userId_departmentId: { userId, departmentId } },
    });
  }
}
