import { formatDate, uid, normalizeNote } from "../crm";

describe("crm", () => {
  describe("formatDate", () => {
    it("formats ISO date string", () => {
      const result = formatDate("2024-01-15T10:30:00.000Z");
      expect(result).toContain("Jan");
      expect(result).toContain("15");
      expect(result).toContain("2024");
    });
  });

  describe("uid", () => {
    it("generates unique IDs", () => {
      const id1 = uid();
      const id2 = uid();
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe("string");
      expect(id1.length).toBeGreaterThan(0);
    });
  });

  describe("normalizeNote", () => {
    it("normalizes valid note data", () => {
      const raw = {
        id: "test-123",
        title: "Test Note",
        content: "Test content",
        tags: ["tag1", "tag2"],
        actionItems: [{ text: "Do something", done: false }],
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      };

      const result = normalizeNote(raw);
      expect(result.id).toBe("test-123");
      expect(result.title).toBe("Test Note");
      expect(result.content).toBe("Test content");
      expect(result.tags).toEqual(["tag1", "tag2"]);
      expect(result.actionItems).toHaveLength(1);
    });

    it("handles null/undefined input", () => {
      const result = normalizeNote(null);
      expect(result.id).toBeDefined();
      expect(result.title).toBe("");
      expect(result.content).toBe("");
      expect(result.tags).toEqual([]);
      expect(result.actionItems).toEqual([]);
    });

    it("handles legacy action_items format", () => {
      const raw = {
        id: "legacy",
        action_items: ["Task 1", "Task 2"],
      };

      const result = normalizeNote(raw);
      expect(result.actionItems).toHaveLength(2);
      expect(result.actionItems![0].text).toBe("Task 1");
      expect(result.actionItems![0].done).toBe(false);
    });

    it("filters invalid action items", () => {
      const raw = {
        id: "mixed",
        actionItems: [
          { text: "Valid task", done: true },
          { text: "", done: false }, // Empty text - should be filtered
          { invalid: "no text property" }, // Missing text - should be filtered
          null,
        ],
      };

      const result = normalizeNote(raw);
      expect(result.actionItems).toHaveLength(1);
      expect(result.actionItems![0].text).toBe("Valid task");
      expect(result.actionItems![0].done).toBe(true);
    });

    it("handles non-string tags", () => {
      const raw = {
        id: "tag-test",
        tags: ["valid", 123, null, "also-valid"],
      };

      const result = normalizeNote(raw);
      expect(result.tags).toEqual(["valid", "also-valid"]);
    });

    it("generates timestamps when missing", () => {
      const raw = { id: "no-dates" };
      const result = normalizeNote(raw);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      // Should be valid ISO strings
      expect(new Date(result.createdAt).toISOString()).toBe(result.createdAt);
    });
  });
});
