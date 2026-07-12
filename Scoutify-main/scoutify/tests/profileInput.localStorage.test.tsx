import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProfileInput from "@/components/ProfileInput";

describe("ProfileInput localStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("submitting form writes unified heightInches to localStorage", async () => {
    const mockOnSubmit = jest.fn();

    render(React.createElement(ProfileInput, { onSubmit: mockOnSubmit }));

    // Get the feet select and set to 6
    const feetSelect = screen.getByDisplayValue("6");
    fireEvent.change(feetSelect, { target: { value: "6" } });

    // Get the inches input and set to 2
    const inchesInput = screen.getByDisplayValue("0");
    fireEvent.change(inchesInput, { target: { value: "2" } });

    // Fill weight (query by id to avoid multiple "pounds" placeholders)
    const weightInput = screen.getByRole("spinbutton", { name: /Weight/i });
    fireEvent.change(weightInput, { target: { value: "195" } });

    // Submit form
    const submitButton = screen.getByRole("button", { name: /Get Analytics/i });
    fireEvent.click(submitButton);

    // Wait for localStorage to be updated
    await waitFor(() => {
      const stored = localStorage.getItem("scoutifyinputdata");
      expect(stored).toBeTruthy();
    });

    const stored = JSON.parse(localStorage.getItem("scoutifyinputdata") || "{}");
    expect(stored.heightInches).toBe(74); // 6 feet 2 inches = 72 + 2 = 74
  });
});
