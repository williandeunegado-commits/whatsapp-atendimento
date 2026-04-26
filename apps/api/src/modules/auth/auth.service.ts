import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { config } from '../../config.js';

export class AuthService {
  constructor(private prisma: PrismaClient) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
    }

    const accessToken = this.signAccess(user);
    const refreshToken = this.signRefresh(user.id);

    return { accessToken, refreshToken, user: this.sanitize(user) };
  }

  async refresh(token: string) {
    let payload: { sub: string };
    try {
      payload = jwt.verify(token, config.JWT_REFRESH_SECRET) as { sub: string };
    } catch {
      throw Object.assign(new Error('Invalid refresh token'), { statusCode: 401 });
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw Object.assign(new Error('User not found'), { statusCode: 401 });
    }

    return { accessToken: this.signAccess(user), user: this.sanitize(user) };
  }

  private signAccess(user: { id: string; email: string; role: string }) {
    return jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      config.JWT_SECRET,
      { expiresIn: '15m' },
    );
  }

  private signRefresh(userId: string) {
    return jwt.sign({ sub: userId }, config.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  }

  private sanitize(user: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl: string | null;
    isActive: boolean;
  }) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
    };
  }
}
