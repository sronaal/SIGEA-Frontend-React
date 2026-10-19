import { describe, expect, it } from "vitest";

import { gradeValidationError, toApiGrade } from "@/lib/format";

describe("grade validation", () => {
  it("accepts a grade typed with a comma", () => {
    expect(gradeValidationError("4,5")).toBeNull();
  });

  it("accepts a grade typed with a point", () => {
    expect(gradeValidationError("4.5")).toBeNull();
  });

  it("rejects more than one decimal with either separator", () => {
    expect(gradeValidationError("4,55")).toBe("Usa una sola cifra decimal (por ejemplo, 4,5).");
    expect(gradeValidationError("4.55")).toBe("Usa una sola cifra decimal (por ejemplo, 4,5).");
  });

  it("rejects a grade outside the 0,0 to 5,0 range", () => {
    expect(gradeValidationError("5,5")).toBe("La nota debe estar entre 0,0 y 5,0.");
    expect(gradeValidationError("5.5")).toBe("La nota debe estar entre 0,0 y 5,0.");
  });

  it("rejects an empty grade", () => {
    expect(gradeValidationError("  ")).toBe("Escribe una nota entre 0,0 y 5,0.");
  });
});

describe("grade API conversion", () => {
  it("normalizes a comma to the decimal point expected by the API", () => {
    expect(toApiGrade("4,5")).toBe(4.5);
  });

  it("keeps a point unchanged", () => {
    expect(toApiGrade("4.5")).toBe(4.5);
  });
});
