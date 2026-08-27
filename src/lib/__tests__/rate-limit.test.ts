import { checkRateLimit } from "../rate-limit";

// Mock Request for jsdom environment
class MockHeaders {
  private map = new Map<string, string>();
  constructor(init?: Record<string, string>) {
    if (init) {
      for (const [k, v] of Object.entries(init)) {
        this.map.set(k.toLowerCase(), v);
      }
    }
  }
  get(name: string) {
    return this.map.get(name.toLowerCase()) ?? null;
  }
}

class MockRequest {
  headers: MockHeaders;
  constructor(_url: string, init?: { headers?: Record<string, string> }) {
    this.headers = new MockHeaders(init?.headers);
  }
}

// Mock global Request
global.Request = MockRequest as unknown as typeof Request;

// Import after mock
import { getClientIp } from "../rate-limit";

describe("rate-limit", () => {
  describe("checkRateLimit", () => {
    it("allows requests within the limit", () => {
      const result = checkRateLimit("test-allow", 5, 60000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it("blocks requests exceeding the limit", () => {
      const key = "test-block-" + Date.now();
      // Exhaust the limit
      for (let i = 0; i < 5; i++) {
        checkRateLimit(key, 5, 60000);
      }
      // Next request should be blocked
      const result = checkRateLimit(key, 5, 60000);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("resets after window expires", () => {
      const key = "test-reset-" + Date.now();
      // Use a very short window
      checkRateLimit(key, 2, 1); // 1ms window
      checkRateLimit(key, 2, 1);

      // Wait for window to expire
      const start = Date.now();
      while (Date.now() - start < 5) {
        // busy wait
      }

      const result = checkRateLimit(key, 2, 1);
      expect(result.allowed).toBe(true);
    });
  });

  describe("getClientIp", () => {
    it("extracts IP from x-forwarded-for", () => {
      const request = new MockRequest("http://localhost", {
        headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
      }) as unknown as Request;
      expect(getClientIp(request)).toBe("1.2.3.4");
    });

    it("extracts IP from x-real-ip", () => {
      const request = new MockRequest("http://localhost", {
        headers: { "x-real-ip": "9.8.7.6" },
      }) as unknown as Request;
      expect(getClientIp(request)).toBe("9.8.7.6");
    });

    it("returns unknown when no IP headers", () => {
      const request = new MockRequest("http://localhost") as unknown as Request;
      expect(getClientIp(request)).toBe("unknown");
    });
  });
});
