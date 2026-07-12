import { describe, it, expect } from "@jest/globals";
import React from "react";
import { render, screen } from "@testing-library/react";
import Skeleton from "@/components/Skeleton";

describe("ModelOutput", () => {
  it("shows loading skeleton with loading text", () => {
    render(React.createElement(Skeleton));

    expect(screen.getByText(/Loading analytics/i)).toBeTruthy();
  });
});
