import { expect, test } from "@playwright/test";

test("loads dashboard and tab controls", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "BasicAlpha" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Earnings" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Price Chart" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Correlation" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Delayed Correlation" })).toBeVisible();
});

test("persists active tab in localStorage", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Correlation" }).click();
  await expect(page.getByText("Correlation Analyzer")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Correlation Analyzer")).toBeVisible();
});
