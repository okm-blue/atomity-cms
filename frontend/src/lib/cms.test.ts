import { describe, expect, it } from "vitest";
import { slugify } from "./cms";

describe("slugify", () => {
  it("normalizes titles to lowercase hyphen-separated slugs", () => {
    expect(slugify("  Héllo, CMS!  ")).toBe("hello-cms");
  });

  it("removes repeated separators and non-latin punctuation", () => {
    expect(slugify("A---B / C")).toBe("a-b-c");
    expect(slugify("")).toBe("");
  });
});
