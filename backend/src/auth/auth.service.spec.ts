import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

const mockUser = {
  id: 'user-uuid-1',
  email: 'test@example.com',
  name: 'Test User',
  passwordHash: 'hashed-password',
  createdAt: new Date(),
};

const mockUsersService = {
  create: jest.fn(),
  findByEmail: jest.fn(),
  findById: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  // ── register ──────────────────────────────────────────────────────────────

  describe('register', () => {
    it('creates a user and returns access token + user object', async () => {
      mockUsersService.create.mockResolvedValue(mockUser);

      const result = await service.register({
        email: 'test@example.com',
        password: 'Password1!',
        name: 'Test User',
      });

      expect(mockUsersService.create).toHaveBeenCalledWith(
        'test@example.com',
        'Password1!',
        'Test User',
      );
      expect(result).toEqual({
        accessToken: 'mock-jwt-token',
        user: { id: mockUser.id, email: mockUser.email, name: mockUser.name },
      });
    });

    it('propagates ConflictException when email already exists', async () => {
      mockUsersService.create.mockRejectedValue(new ConflictException('Email already in use'));

      await expect(
        service.register({ email: 'test@example.com', password: 'Password1!', name: 'Test' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  // ── login ─────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns a token when credentials are valid', async () => {
      const hash = await bcrypt.hash('Password1!', 12);
      mockUsersService.findByEmail.mockResolvedValue({ ...mockUser, passwordHash: hash });

      const result = await service.login({
        email: 'test@example.com',
        password: 'Password1!',
      });

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.email).toBe('test@example.com');
    });

    it('throws UnauthorizedException when user does not exist', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'anything' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser); // pre-set hash doesn't match

      await expect(
        service.login({ email: 'test@example.com', password: 'wrong-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
