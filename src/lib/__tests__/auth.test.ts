// Mock jose module for ESM compatibility
jest.mock("jose", () => ({
  SignJWT: jest.fn().mockImplementation(() => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setIssuer: jest.fn().mockReturnThis(),
    setAudience: jest.fn().mockReturnThis(),
    setIssuedAt: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    sign: jest.fn().mockResolvedValue("mock.jwt.token"),
  })),
  jwtVerify: jest.fn(),
}));

// Mock next/headers
jest.mock("next/headers", () => ({
  cookies: jest.fn().mockResolvedValue({
    get: jest.fn(),
    set: jest.fn(),
  }),
}));

// Set AUTH_SECRET for tests
process.env.AUTH_SECRET = "test-secret-key-for-jest-tests-only-32chars!";

import { signToken, verifyToken, hashPassword, verifyPassword } from "../auth";
import { jwtVerify } from "jose";

describe("auth", () => {
  describe("signToken and verifyToken", () => {
    it("creates a token via SignJWT", async () => {
      const email = "test@example.com";
      const token = await signToken(email);
      expect(typeof token).toBe("string");
      expect(token).toBe("mock.jwt.token");
    });

    it("returns null for invalid token when jwtVerify throws", async () => {
      (jwtVerify as jest.Mock).mockRejectedValueOnce(new Error("invalid"));
      const result = await verifyToken("invalid.token.here");
      expect(result).toBeNull();
    });

    it("returns email for valid token", async () => {
      (jwtVerify as jest.Mock).mockResolvedValueOnce({
        payload: { email: "user@example.com" },
      });
      const result = await verifyToken("valid.token");
      expect(result).toBe("user@example.com");
    });

    it("returns null if payload email is not a string", async () => {
      (jwtVerify as jest.Mock).mockResolvedValueOnce({
        payload: { email: 123 },
      });
      const result = await verifyToken("valid.token");
      expect(result).toBeNull();
    });
  });

  describe("hashPassword and verifyPassword", () => {
    it("hashes and verifies a password", async () => {
      const password = "mySecurePassword123!";
      const hash = await hashPassword(password);

      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);

      const valid = await verifyPassword(password, hash);
      expect(valid).toBe(true);
    });

    it("rejects wrong password", async () => {
      const hash = await hashPassword("correct-password");
      const valid = await verifyPassword("wrong-password", hash);
      expect(valid).toBe(false);
    });

    it("generates different hashes for same password", async () => {
      const hash1 = await hashPassword("same-password");
      const hash2 = await hashPassword("same-password");
      expect(hash1).not.toBe(hash2);
      // But both should verify correctly
      expect(await verifyPassword("same-password", hash1)).toBe(true);
      expect(await verifyPassword("same-password", hash2)).toBe(true);
    });
  });
});
