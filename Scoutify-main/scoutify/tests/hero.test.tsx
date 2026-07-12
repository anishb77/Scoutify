import { describe, it, expect } from "@jest/globals";
import React from "react";
import { render, screen } from "@testing-library/react";
import Hero from "@/components/Hero";

describe("Hero", () => {
  it("renders primary header and CTA", () => {
    render(React.createElement(Hero));

    expect(screen.getByText(/Free Analytics For All./i)).toBeTruthy();
    expect(screen.getByText(/Scroll and Start Now!/i)).toBeTruthy();
  });
});
