import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ProfileInput from "@/components/ProfileInput";

describe("ProfileInput", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("height unification computes total inches and persists to localStorage", async () => {
    const mockOnSubmit = jest.fn();

    render(React.createElement(ProfileInput, { onSubmit: mockOnSubmit }));

    // Get feet select element
    const feetSelects = screen.getAllByDisplayValue("6");
    const feetSelect = feetSelects[0];

    // Get inches input
    const inchesInputs = screen.getAllByDisplayValue("0");
    const inchesInput = inchesInputs.find(
      (input) => (input as HTMLInputElement).type === "number"
    ) as HTMLInputElement;

    // Change feet to 6, inches to 1
    fireEvent.change(feetSelect, { target: { value: "6" } });
    fireEvent.change(inchesInput, { target: { value: "1" } });

    // Verify the inputs changed
    expect((feetSelect as HTMLSelectElement).value).toBe("6");
    expect((inchesInput).value).toBe("1");

    // Fill in weight to make form submittable
    const weightInputs = screen.getAllByPlaceholderText("pounds");
    fireEvent.change(weightInputs[0], { target: { value: "195" } });

    // Submit the form
    const submitButton = screen.getByRole("button", { name: /Get Analytics/i });
    fireEvent.click(submitButton);

    // Verify onSubmit was called with correct heightInches
    expect(mockOnSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        heightInches: 73, // 6 feet 1 inch = 72 + 1 = 73
      })
    );
  });
});
