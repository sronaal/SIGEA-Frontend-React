import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";

import { AppProviders } from "@/app/providers";
import { routes } from "@/app/router";

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
}

describe("application router", () => {
  it("renders the guardian access screen at /acudientes", async () => {
    renderAt("/acudientes");

    expect(
      await screen.findByRole("heading", { name: /consulta académica de acudientes/i }),
    ).toBeInTheDocument();
  });

  it("redirects the root path to the guardian access route", async () => {
    renderAt("/");

    expect(
      await screen.findByRole("heading", { name: /consulta académica de acudientes/i }),
    ).toBeInTheDocument();
  });

  it("renders the not found screen for an unknown route", async () => {
    renderAt("/ruta-inexistente");

    expect(await screen.findByRole("heading", { name: /página no encontrada/i })).toBeInTheDocument();
  });
});
